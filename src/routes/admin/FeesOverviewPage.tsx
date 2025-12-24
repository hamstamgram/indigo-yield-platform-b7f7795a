/**
 * INDIGO Fees Page
 * Shows platform fee collection, INDIGO FEES account balance, yield earned,
 * and audit trail with full distribution history
 */

import { useState, useEffect, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet, FileText, TrendingUp, ArrowUpRight, Calendar, Download, AlertCircle, Info, ArrowRightLeft } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";

interface FeeRecord {
  id: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  fundId: string;
  fundName: string;
  asset: string;
  amount: number;
  type: string;
  txDate: string;
  purpose: string;
  visibilityScope: string;
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

interface RoutingAuditEntry {
  id: string;
  action: string;
  actor_user: string | null;
  created_at: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  actor_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface RoutingSummary {
  totalAmount: number;
  totalCount: number;
  byAsset: Record<string, { amount: number; count: number }>;
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
  const [routingAuditEntries, setRoutingAuditEntries] = useState<RoutingAuditEntry[]>([]);
  const [routingSummary, setRoutingSummary] = useState<RoutingSummary>({
    totalAmount: 0,
    totalCount: 0,
    byAsset: {},
  });
  const [activeTab, setActiveTab] = useState("overview");
  
  // Date filtering
  const [dateFrom, setDateFrom] = useState<string>(() => 
    format(startOfMonth(subMonths(new Date(), 3)), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState<string>(() => 
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

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

      // Load fee-related transactions from transactions_v2
      const { data: feeTxData, error: feeTxError } = await supabase
        .from("transactions_v2")
        .select(`
          id,
          investor_id,
          fund_id,
          asset,
          amount,
          type,
          tx_date,
          purpose,
          visibility_scope,
          created_at
        `)
        .in("type", ["FEE", "FEE_CREDIT", "IB_CREDIT", "INTERNAL_WITHDRAWAL", "INTERNAL_CREDIT"])
        .order("created_at", { ascending: false })
        .limit(1000);

      if (feeTxError) throw feeTxError;

      // Enrich with investor and fund details
      const investorIds = [...new Set((feeTxData || []).map(t => t.investor_id))];
      const fundIds = [...new Set((feeTxData || []).map(t => t.fund_id))];

      const { data: investorProfiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", investorIds);

      const { data: fundDetailsForFees } = await supabase
        .from("funds")
        .select("id, name, asset")
        .in("id", fundIds);

      const investorMap = new Map((investorProfiles || []).map(p => [p.id, p]));
      const fundMapForFees = new Map((fundDetailsForFees || []).map(f => [f.id, f]));

      const feeRecords: FeeRecord[] = (feeTxData || []).map((tx: any) => {
        const investor = investorMap.get(tx.investor_id);
        const fund = fundMapForFees.get(tx.fund_id);
        return {
          id: tx.id,
          investorId: tx.investor_id,
          investorName: investor
            ? `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || investor.email
            : "Unknown",
          investorEmail: investor?.email || "",
          fundId: tx.fund_id,
          fundName: fund?.name || "Unknown",
          asset: tx.asset || fund?.asset || "",
          amount: Number(tx.amount),
          type: tx.type,
          txDate: tx.tx_date,
          purpose: tx.purpose || "",
          visibilityScope: tx.visibility_scope || "",
          createdAt: tx.created_at,
        };
      });

      setFees(feeRecords);

      // Calculate summaries by asset (from all data, not filtered)
      const summaryMap = new Map<string, FeeSummary>();
      feeRecords.forEach((fee) => {
        const existing = summaryMap.get(fee.asset) || {
          assetCode: fee.asset,
          totalAmount: 0,
          transactionCount: 0,
        };
        existing.totalAmount += fee.amount;
        existing.transactionCount += 1;
        summaryMap.set(fee.asset, existing);
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

      // Load routing audit entries from audit_log for route_to_fees actions
      const { data: routingAuditData, error: routingError } = await supabase
        .from("audit_log")
        .select("*")
        .eq("action", "route_to_fees")
        .order("created_at", { ascending: false })
        .limit(100);

      if (routingError) {
        console.warn("Could not load routing audit entries:", routingError);
      }

      // Enrich routing audit with actor profiles
      if (routingAuditData && routingAuditData.length > 0) {
        const actorIds = [...new Set(routingAuditData.map(r => r.actor_user).filter(Boolean))];
        
        const { data: actorProfiles } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", actorIds);

        const actorMap = new Map((actorProfiles || []).map(p => [p.id, p]));

        const enrichedRoutingEntries: RoutingAuditEntry[] = routingAuditData.map((entry: any) => ({
          id: entry.id,
          action: entry.action,
          actor_user: entry.actor_user,
          created_at: entry.created_at,
          entity_id: entry.entity_id,
          old_values: entry.old_values,
          new_values: entry.new_values,
          meta: entry.meta,
          actor_profile: entry.actor_user ? actorMap.get(entry.actor_user) : null,
        }));

        setRoutingAuditEntries(enrichedRoutingEntries);

        // Calculate routing summary
        const summary: RoutingSummary = {
          totalAmount: 0,
          totalCount: enrichedRoutingEntries.length,
          byAsset: {},
        };

        enrichedRoutingEntries.forEach((entry) => {
          const meta = (entry.meta || {}) as Record<string, unknown>;
          const newValues = (entry.new_values || {}) as Record<string, unknown>;
          const amount = Number(meta.amount || newValues.amount || 0);
          const asset = (meta.asset_code as string) || (newValues.asset_code as string) || "USD";

          summary.totalAmount += amount;

          if (!summary.byAsset[asset]) {
            summary.byAsset[asset] = { amount: 0, count: 0 };
          }
          summary.byAsset[asset].amount += amount;
          summary.byAsset[asset].count += 1;
        });

        setRoutingSummary(summary);
      } else {
        setRoutingAuditEntries([]);
        setRoutingSummary({ totalAmount: 0, totalCount: 0, byAsset: {} });
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

  // Filter fees by date range and fund
  const filteredFees = useMemo(() => {
    return fees.filter((fee) => {
      // Fund filter
      if (selectedFund !== "all" && fee.fundId !== selectedFund) {
        return false;
      }
      // Date filter
      const feeDate = parseISO(fee.txDate || fee.createdAt);
      const fromDate = parseISO(dateFrom);
      const toDate = parseISO(dateTo);
      return isWithinInterval(feeDate, { start: fromDate, end: toDate });
    });
  }, [fees, selectedFund, dateFrom, dateTo]);

  // Calculate filtered summaries
  const filteredSummaries = useMemo(() => {
    const summaryMap = new Map<string, FeeSummary>();
    filteredFees.forEach((fee) => {
      const existing = summaryMap.get(fee.asset) || {
        assetCode: fee.asset,
        totalAmount: 0,
        transactionCount: 0,
      };
      existing.totalAmount += fee.amount;
      existing.transactionCount += 1;
      summaryMap.set(fee.asset, existing);
    });
    return Array.from(summaryMap.values());
  }, [filteredFees]);

  const formatAmount = (amount: number, asset: string) => {
    if (asset === "BTC") {
      return amount.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 8 });
    }
    return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Investor", "Email", "Fund", "Asset", "Type", "Amount", "Purpose", "Visibility"];
    const rows = filteredFees.map(fee => [
      fee.txDate || fee.createdAt,
      fee.investorName,
      fee.investorEmail,
      fee.fundName,
      fee.asset,
      fee.type,
      fee.amount.toString(),
      fee.purpose,
      fee.visibilityScope
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `indigo-fees-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
          <TabsTrigger value="routing" className="flex items-center gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Internal Routing
            {routingSummary.totalCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {routingSummary.totalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="yield">Yield Earned</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Summary Cards Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* INDIGO Fees Account Balance */}
            <Card className="border-primary/30 bg-primary/5 lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Wallet className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="text-base">INDIGO Fees Account Balance</CardTitle>
                    <CardDescription className="text-xs">Current fund positions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(indigoFeesBalance).length > 0 ? (
                    Object.entries(indigoFeesBalance).map(([asset, balance]) => (
                      <div key={asset} className="flex items-center gap-3 p-2.5 rounded-lg bg-background">
                        <CryptoIcon symbol={asset} className="h-7 w-7" />
                        <div>
                          <p className="font-mono font-semibold text-sm">{formatAmount(balance, asset)}</p>
                          <p className="text-xs text-muted-foreground">{asset}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-muted-foreground">
                      <Info className="h-4 w-4" />
                      <p className="text-sm">No balances recorded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Internal Routing Summary Card */}
            <Card className={routingSummary.totalCount > 0 ? "border-orange-500/30 bg-orange-500/5" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className={`h-6 w-6 ${routingSummary.totalCount > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                  <div>
                    <CardTitle className="text-base">Internal Routing</CardTitle>
                    <CardDescription className="text-xs">Withdrawals routed to INDIGO</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.keys(routingSummary.byAsset).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(routingSummary.byAsset).map(([asset, data]) => (
                        <div key={asset} className="flex items-center gap-2">
                          <CryptoIcon symbol={asset} className="h-5 w-5" />
                          <p className={`text-lg font-mono font-bold ${routingSummary.totalCount > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                            {formatAmount(data.amount, asset)} {asset}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-lg font-mono text-muted-foreground">0.00</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {routingSummary.totalCount} withdrawal{routingSummary.totalCount !== 1 ? "s" : ""} routed
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                  <div>
                    <CardTitle className="text-base">Yield Earned</CardTitle>
                    <CardDescription className="text-xs">On fee balances</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {yieldEarned.length > 0 ? (
                    <>
                      <p className="text-2xl font-mono font-bold text-emerald-600">
                        +{yieldEarned.reduce((sum, y) => sum + y.totalYieldEarned, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {yieldEarned.reduce((sum, y) => sum + y.transactionCount, 0)} distributions
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No yield earned yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Date Filter and Summary Cards */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Date Filter */}
            <Card className="lg:w-80 shrink-0">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Date Range</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setDateFrom(format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
                      setDateTo(format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
                    }}
                  >
                    Last Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setDateFrom(format(startOfMonth(new Date()), "yyyy-MM-dd"));
                      setDateTo(format(endOfMonth(new Date()), "yyyy-MM-dd"));
                    }}
                  >
                    This Month
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="flex-1 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSummaries.length > 0 ? (
                filteredSummaries.map((summary) => (
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
                ))
              ) : (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardContent className="p-6 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No fee transactions in selected date range</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Fee Records Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Fee Transactions</CardTitle>
                  <CardDescription>Individual fee deductions and credits</CardDescription>
                </div>
                <div className="flex items-center gap-2">
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
                  <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredFees.length === 0}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Investor</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Visibility</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <div className="space-y-2">
                            <AlertCircle className="h-8 w-8 mx-auto opacity-50" />
                            <p>No fee transactions found</p>
                            <p className="text-xs max-w-md mx-auto">
                              Fee transactions (FEE, FEE_CREDIT, IB_CREDIT) are created during yield distributions.
                              Try adjusting the date range or run a yield distribution to generate fee records.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFees.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell>
                            {format(new Date(fee.txDate || fee.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{fee.investorName}</p>
                              <p className="text-xs text-muted-foreground">{fee.investorEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CryptoIcon symbol={fee.asset} className="h-5 w-5" />
                              <span className="text-sm">{fee.fundName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={fee.type === "FEE_CREDIT" ? "default" : fee.type === "IB_CREDIT" ? "secondary" : "outline"}
                              className={fee.type === "FEE_CREDIT" ? "bg-emerald-600" : ""}
                            >
                              {fee.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={fee.amount > 0 ? "text-emerald-600" : ""}>
                              {fee.amount > 0 ? "+" : ""}{formatAmount(fee.amount, fee.asset)}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">{fee.asset}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {fee.purpose || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs ${fee.visibilityScope === "admin_only" ? "text-amber-500" : "text-muted-foreground"}`}>
                              {fee.visibilityScope || "—"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredFees.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  Showing {filteredFees.length} of {fees.length} total transactions
                </p>
              )}
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
              {feeAllocations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">No fee allocations recorded yet</p>
                  <p className="text-sm max-w-md mx-auto">
                    Fee allocations are created during month-end reporting yield distributions.
                    Once a distribution is run, detailed allocation records will appear here for audit purposes.
                  </p>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg max-w-md mx-auto text-left">
                    <p className="text-xs font-medium text-foreground mb-2">Alternative Data Source:</p>
                    <p className="text-xs">
                      Fee transactions from <code className="bg-background px-1 rounded">transactions_v2</code> are 
                      displayed in the Overview tab. These provide a complete record of all fee movements.
                    </p>
                  </div>
                </div>
              ) : (
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
                      {feeAllocations.map((allocation) => (
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
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px] inline-block" title={allocation.distribution_id}>
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routing" className="space-y-6 mt-4">
          {/* Routing Summary by Asset */}
          {Object.keys(routingSummary.byAsset).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Routing by Asset</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(routingSummary.byAsset).map(([asset, data]) => (
                    <div key={asset} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted">
                      <CryptoIcon symbol={asset} className="h-6 w-6" />
                      <div>
                        <p className="font-mono font-semibold">
                          {formatAmount(data.amount, asset)} {asset}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.count} routing{data.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Routing Audit Trail Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="h-6 w-6 text-orange-500" />
                <div>
                  <CardTitle>Internal Routing Audit Trail</CardTitle>
                  <CardDescription>
                    Tracks all withdrawals routed to INDIGO Fees account instead of external payout
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {routingAuditEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">No internal routing events recorded</p>
                  <p className="text-sm max-w-md mx-auto">
                    When withdrawals are routed to INDIGO FEES instead of external payout, 
                    they will appear here for audit purposes.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Source Investor</TableHead>
                        <TableHead>Withdrawal ID</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routingAuditEntries.map((entry) => {
                        const meta = (entry.meta || {}) as Record<string, unknown>;
                        const newValues = (entry.new_values || {}) as Record<string, unknown>;
                        const oldValues = (entry.old_values || {}) as Record<string, unknown>;
                        
                        const amount = Number(meta.amount || newValues.amount || 0);
                        const asset = (meta.asset_code as string) || (newValues.asset_code as string) || "USD";
                        const sourceInvestorName = (meta.source_investor_name as string) || 
                          (meta.investor_name as string) || 
                          (oldValues.investor_name as string) || "";
                        const sourceInvestorEmail = (meta.source_investor_email as string) || 
                          (meta.investor_email as string) || 
                          (oldValues.investor_email as string) || "";
                        const withdrawalId = entry.entity_id || (meta.withdrawal_id as string) || "-";

                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              {entry.actor_profile ? (
                                <div>
                                  <p className="text-sm font-medium">
                                    {`${entry.actor_profile.first_name || ""} ${entry.actor_profile.last_name || ""}`.trim() || entry.actor_profile.email}
                                  </p>
                                  {entry.actor_profile.email && entry.actor_profile.first_name && (
                                    <p className="text-xs text-muted-foreground">{entry.actor_profile.email}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">System</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{sourceInvestorName || "Unknown"}</p>
                                {sourceInvestorEmail && (
                                  <p className="text-xs text-muted-foreground">{sourceInvestorEmail}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px] inline-block" title={withdrawalId}>
                                {withdrawalId.slice(0, 8)}...
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CryptoIcon symbol={asset} className="h-4 w-4" />
                                <Badge variant="outline">{asset}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatAmount(amount, asset)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* How Internal Routing Works */}
          <Card>
            <CardHeader>
              <CardTitle>How Internal Routing Works</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Withdrawal Request:</strong> An investor requests a withdrawal from their fund position.
                </li>
                <li>
                  <strong className="text-foreground">Admin Routes to INDIGO:</strong> Instead of processing as external payout, admin routes the withdrawal to INDIGO Fees account.
                </li>
                <li>
                  <strong className="text-foreground">Internal Transfer:</strong> An INTERNAL_WITHDRAWAL is created for the source investor, and an INTERNAL_CREDIT is created for INDIGO FEES.
                </li>
                <li>
                  <strong className="text-foreground">Audit Trail:</strong> The routing action is recorded in the audit log for compliance and reconciliation.
                </li>
              </ol>
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
                  <p className="font-medium mb-1">No yield earned yet</p>
                  <p className="text-sm max-w-md mx-auto">
                    Yield will be earned when month-end reporting distributions include INDIGO FEES positions.
                    The account needs a balance first, which comes from fee collections.
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
