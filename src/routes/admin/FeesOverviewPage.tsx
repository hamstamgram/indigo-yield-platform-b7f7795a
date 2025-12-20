/**
 * INDIGO Fees Page
 * Shows platform fee collection, INDIGO FEES account balance, yield earned,
 * and audit trail with full distribution history
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
import { Loader2, DollarSign, Users, TrendingUp, Wallet, FileText, ArrowUpRight } from "lucide-react";
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

interface FeeAllocation {
  id: string;
  distribution_id: string;
  fund_id: string;
  investor_id: string;
  period_start: string;
  period_end: string;
  purpose: string;
  base_net_income: number;
  fee_percentage: number;
  fee_amount: number;
  created_at: string;
  investor_name?: string;
  investor_email?: string;
  fund_name?: string;
  fund_asset?: string;
}

interface YieldEarned {
  fundId: string;
  fundName: string;
  asset: string;
  totalYieldEarned: number;
  transactionCount: number;
}

function FeesOverviewContent() {
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [feeSummaries, setFeeSummaries] = useState<FeeSummary[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>("all");
  const [indigoFeesBalance, setIndigoFeesBalance] = useState<Record<string, number>>({});
  const [feeAllocations, setFeeAllocations] = useState<FeeAllocation[]>([]);
  const [yieldEarned, setYieldEarned] = useState<YieldEarned[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

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

      // Load fee allocations (audit trail)
      const { data: allocationsData } = await supabase
        .from("fee_allocations")
        .select(`
          id,
          distribution_id,
          fund_id,
          investor_id,
          period_start,
          period_end,
          purpose,
          base_net_income,
          fee_percentage,
          fee_amount,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      // Enrich with investor and fund names
      if (allocationsData && allocationsData.length > 0) {
        const investorIds = [...new Set(allocationsData.map(a => a.investor_id))];
        const fundIds = [...new Set(allocationsData.map(a => a.fund_id))];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", investorIds);

        const { data: fundDetails } = await supabase
          .from("funds")
          .select("id, name, asset")
          .in("id", fundIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        const fundMap = new Map((fundDetails || []).map(f => [f.id, f]));

        const enrichedAllocations: FeeAllocation[] = allocationsData.map(a => {
          const profile = profileMap.get(a.investor_id);
          const fund = fundMap.get(a.fund_id);
          return {
            ...a,
            investor_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email : "Unknown",
            investor_email: profile?.email || "",
            fund_name: fund?.name || "Unknown",
            fund_asset: fund?.asset || "",
          };
        });
        setFeeAllocations(enrichedAllocations);
      }

      // Load yield earned by INDIGO FEES account (transactions)
      const { data: yieldTxs } = await supabase
        .from("transactions_v2")
        .select("fund_id, amount, type")
        .eq("investor_id", INDIGO_FEES_ACCOUNT_ID)
        .eq("type", "INTEREST");

      if (yieldTxs && yieldTxs.length > 0 && fundsData) {
        const yieldByFund = new Map<string, { total: number; count: number }>();
        yieldTxs.forEach(tx => {
          const existing = yieldByFund.get(tx.fund_id) || { total: 0, count: 0 };
          existing.total += Number(tx.amount || 0);
          existing.count += 1;
          yieldByFund.set(tx.fund_id, existing);
        });

        const yieldData: YieldEarned[] = [];
        yieldByFund.forEach((data, fundId) => {
          const fund = fundsData.find(f => f.id === fundId);
          if (fund) {
            yieldData.push({
              fundId,
              fundName: fund.name,
              asset: fund.asset,
              totalYieldEarned: data.total,
              transactionCount: data.count,
            });
          }
        });
        setYieldEarned(yieldData);
      }
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
        <h1 className="text-3xl font-display font-bold tracking-tight">INDIGO Fees</h1>
        <p className="text-muted-foreground mt-1">
          Platform fee collection and yield participation tracking
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="yield">Yield Earned</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
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
                  <CardTitle>INDIGO Fees Account Balance</CardTitle>
                  <CardDescription>Current fund positions (fees + yield earned)</CardDescription>
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
        </TabsContent>

        <TabsContent value="audit" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Fee Allocation Audit Trail</CardTitle>
                  <CardDescription>
                    Complete record of all fee allocations with distribution IDs for reconciliation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Distribution ID</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead>Source Investor</TableHead>
                      <TableHead className="text-right">Base Income</TableHead>
                      <TableHead className="text-right">Fee %</TableHead>
                      <TableHead className="text-right">Fee Amount</TableHead>
                      <TableHead>Purpose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeAllocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No fee allocations recorded yet. Allocations are created during month-end reporting yield distributions.
                        </TableCell>
                      </TableRow>
                    ) : (
                      feeAllocations.map((allocation) => (
                        <TableRow key={allocation.id}>
                          <TableCell>
                            <div className="text-sm">
                              <p>{format(new Date(allocation.period_start), "MMM d")}</p>
                              <p className="text-muted-foreground">
                                to {format(new Date(allocation.period_end), "MMM d, yyyy")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {allocation.distribution_id.slice(0, 8)}...
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {allocation.fund_asset && (
                                <CryptoIcon symbol={allocation.fund_asset} className="h-4 w-4" />
                              )}
                              <span className="text-sm">{allocation.fund_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{allocation.investor_name}</p>
                              <p className="text-xs text-muted-foreground">{allocation.investor_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatAmount(allocation.base_net_income, allocation.fund_asset || "")}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {allocation.fee_percentage}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">
                            {formatAmount(allocation.fee_amount, allocation.fund_asset || "")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={allocation.purpose === "reporting" ? "default" : "secondary"}>
                              {allocation.purpose}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yield" className="space-y-6 mt-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
                <div>
                  <CardTitle>Yield Earned by INDIGO Fees Account</CardTitle>
                  <CardDescription>
                    INDIGO FEES participates in yield distributions just like any investor. 
                    This shows yield earned on the accumulated fee balance.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {yieldEarned.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {yieldEarned.map((item) => (
                    <div key={item.fundId} className="p-4 rounded-lg bg-background border">
                      <div className="flex items-center gap-3 mb-3">
                        <CryptoIcon symbol={item.asset} className="h-8 w-8" />
                        <div>
                          <p className="font-medium">{item.fundName}</p>
                          <p className="text-xs text-muted-foreground">{item.asset}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Yield</span>
                          <span className="font-mono font-semibold text-emerald-600">
                            +{formatAmount(item.totalYieldEarned, item.asset)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Distributions</span>
                          <span className="text-sm">{item.transactionCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowUpRight className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No yield earned yet</p>
                  <p className="text-sm mt-1">
                    Yield will be earned when month-end reporting distributions include INDIGO FEES positions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How INDIGO Fees Yields Work</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Fee Collection:</strong> Platform fees are collected from investors during month-end reporting yield distributions.
                </li>
                <li>
                  <strong className="text-foreground">Credit to INDIGO FEES:</strong> Collected fees are credited to the INDIGO FEES account position within each fund.
                </li>
                <li>
                  <strong className="text-foreground">Yield Participation:</strong> On subsequent month-end distributions, INDIGO FEES receives yield on its accumulated balance, just like any other investor.
                </li>
                <li>
                  <strong className="text-foreground">Compound Growth:</strong> This creates compound growth as fees earn yield, which then earns more yield.
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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