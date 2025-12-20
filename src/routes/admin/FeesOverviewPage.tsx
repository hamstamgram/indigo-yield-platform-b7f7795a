/**
 * Fees Overview Page
 * Shows per-account and total fees with routing to INDIGO Fees account
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Users, TrendingUp, Wallet } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format } from "date-fns";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";

interface FeeRecord {
  id: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  assetCode: string;
  amount: number;
  kind: string;
  periodMonth: number | null;
  periodYear: number | null;
  createdAt: string;
}

interface FeeSummary {
  assetCode: string;
  totalAmount: number;
  transactionCount: number;
}

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

function FeesOverviewContent() {
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [feeSummaries, setFeeSummaries] = useState<FeeSummary[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>("all");
  const [indigoFeesBalance, setIndigoFeesBalance] = useState<Record<string, number>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      // Load funds
      const { data: fundsData } = await supabase
        .from("funds")
        .select("id, code, name, asset")
        .eq("status", "active")
        .order("code");

      setFunds(fundsData || []);

      // Load all fee records
      const { data: feesData, error: feesError } = await supabase
        .from("fees")
        .select(`
          id,
          investor_id,
          asset_code,
          amount,
          kind,
          period_month,
          period_year,
          created_at,
          profiles!fk_fees_investor (
            email,
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (feesError) throw feesError;

      const feeRecords: FeeRecord[] = (feesData || []).map((f: any) => ({
        id: f.id,
        investorId: f.investor_id,
        investorName: f.profiles
          ? `${f.profiles.first_name || ""} ${f.profiles.last_name || ""}`.trim() || f.profiles.email
          : "Unknown",
        investorEmail: f.profiles?.email || "",
        assetCode: f.asset_code,
        amount: Number(f.amount),
        kind: f.kind,
        periodMonth: f.period_month,
        periodYear: f.period_year,
        createdAt: f.created_at,
      }));

      setFees(feeRecords);

      // Calculate summaries by asset
      const summaryMap = new Map<string, FeeSummary>();
      feeRecords.forEach((fee) => {
        const existing = summaryMap.get(fee.assetCode) || {
          assetCode: fee.assetCode,
          totalAmount: 0,
          transactionCount: 0,
        };
        existing.totalAmount += fee.amount;
        existing.transactionCount += 1;
        summaryMap.set(fee.assetCode, existing);
      });
      setFeeSummaries(Array.from(summaryMap.values()));

      // Get INDIGO Fees account balances
      const { data: indigoPositions } = await supabase
        .from("investor_positions")
        .select("fund_id, current_value, funds!inner(asset)")
        .eq("investor_id", INDIGO_FEES_ACCOUNT_ID);

      const balances: Record<string, number> = {};
      (indigoPositions || []).forEach((p: any) => {
        const asset = p.funds?.asset;
        if (asset) {
          balances[asset] = (balances[asset] || 0) + Number(p.current_value || 0);
        }
      });
      setIndigoFeesBalance(balances);
    } catch (error) {
      console.error("Error loading fees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFees =
    selectedFund === "all"
      ? fees
      : fees.filter((f) => {
          const fund = funds.find((fd) => fd.asset === f.assetCode);
          return fund?.id === selectedFund;
        });

  const formatAmount = (amount: number, asset: string) => {
    if (asset === "BTC") {
      return amount.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 8 });
    }
    return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Fee Management</h1>
        <p className="text-muted-foreground mt-1">
          Track platform fees collected across all funds
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {feeSummaries.map((summary) => (
          <Card key={summary.assetCode}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CryptoIcon symbol={summary.assetCode} className="h-10 w-10" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase">{summary.assetCode} Fees</p>
                  <p className="text-xl font-mono font-bold">
                    {formatAmount(summary.totalAmount, summary.assetCode)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.transactionCount} transactions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* INDIGO Fees Account Balance */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>INDIGO Fees Account</CardTitle>
              <CardDescription>Platform fee collection destination</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(indigoFeesBalance).length > 0 ? (
              Object.entries(indigoFeesBalance).map(([asset, balance]) => (
                <div key={asset} className="flex items-center gap-3 p-3 rounded-lg bg-background">
                  <CryptoIcon symbol={asset} className="h-8 w-8" />
                  <div>
                    <p className="font-mono font-semibold">{formatAmount(balance, asset)}</p>
                    <p className="text-xs text-muted-foreground">{asset}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground col-span-4">No balances recorded yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fee Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fee Transactions</CardTitle>
              <CardDescription>Individual fee deductions from investor accounts</CardDescription>
            </div>
            <Select value={selectedFund} onValueChange={setSelectedFund}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by fund" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No fee transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell>
                        {format(new Date(fee.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{fee.investorName}</p>
                          <p className="text-xs text-muted-foreground">{fee.investorEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CryptoIcon symbol={fee.assetCode} className="h-5 w-5" />
                          {fee.assetCode}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{fee.kind}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(fee.amount, fee.assetCode)}
                      </TableCell>
                      <TableCell>
                        {fee.periodMonth && fee.periodYear
                          ? `${fee.periodMonth}/${fee.periodYear}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FeesOverviewPage() {
  return (
    <AdminGuard>
      <FeesOverviewContent />
    </AdminGuard>
  );
}
