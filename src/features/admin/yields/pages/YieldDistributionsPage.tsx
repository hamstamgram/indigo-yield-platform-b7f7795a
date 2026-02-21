/**
 * Yield Distributions Admin Page
 * Monthly distribution overview with per-investor allocation breakdown
 * Features: void distribution, export, reconciliation checks
 */

import { useState, useMemo, useCallback } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { AdminGuard } from "@/components/admin";
import { useFunds, useUrlFilters } from "@/hooks";
import { useYieldDistributionsPage } from "@/features/admin/yields/hooks/useYieldDistributionsPage";
import type {
  InvestorProfile,
  DistributionRow,
  FeeAllocationRow,
  YieldEventRow,
} from "@/services/admin/yields/yieldDistributionsPageService";
import { FinancialValue } from "@/components/common/FinancialValue";
import { ExportButton } from "@/components/common/ExportButton";
import { LastUpdated } from "@/components/common/LastUpdated";
import { VoidDistributionDialog } from "@/features/admin/yields/components/VoidDistributionDialog";
import { voidYieldDistribution } from "@/services/admin/yields/yieldManagementService";
import { executeInternalRoute } from "@/services/admin/internalRouteService";
import { formatAssetValue, formatPercentage } from "@/utils/formatters";
import type { ExportColumn } from "@/lib/export/csv-export";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { PageShell } from "@/components/layout/PageShell";
import { CryptoIcon } from "@/components/CryptoIcons";
import { ArrowRightLeft, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks";
import { QUERY_KEYS } from "@/constants/queryKeys";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

const CRYSTALLIZATION_TRIGGER_TYPES = ["deposit", "withdrawal", "transaction"];

function isCrystallizationDist(d: DistributionRow): boolean {
  return CRYSTALLIZATION_TRIGGER_TYPES.includes(d.distribution_type || "");
}

function formatInvestorName(profile?: InvestorProfile | null): string {
  if (!profile) return "Unknown";
  const full = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  return full || profile.email || "Unknown";
}

function FeeAllocationsTable({
  feeAllocations,
  investorMap,
  asset,
}: {
  feeAllocations: FeeAllocationRow[];
  investorMap: Record<string, InvestorProfile>;
  asset: string;
}) {
  return (
    <>
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead>Investor</TableHead>
            <TableHead className="text-right">Gross Income</TableHead>
            <TableHead className="text-right">Fee %</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead className="text-right">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feeAllocations.map((fa) => {
            const investor = investorMap[fa.investor_id];
            return (
              <TableRow key={fa.id}>
                <TableCell>
                  <div className="font-medium">{formatInvestorName(investor)}</div>
                  <div className="text-xs text-muted-foreground">
                    {investor?.email || fa.investor_id}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <FinancialValue value={fa.base_net_income} asset={asset} />
                </TableCell>
                <TableCell className="text-right">
                  {formatPercentage(fa.fee_percentage, 2)}
                </TableCell>
                <TableCell className="text-right">
                  <FinancialValue value={fa.fee_amount} asset={asset} />
                </TableCell>
                <TableCell className="text-right font-semibold">
                  <FinancialValue value={fa.base_net_income - fa.fee_amount} asset={asset} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

function CrystallizationEventsTable({
  events,
  investorMap,
  asset,
}: {
  events: YieldEventRow[];
  investorMap: Record<string, InvestorProfile>;
  asset: string;
}) {
  return (
    <>
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead>Investor</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Share %</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Fee %</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead className="text-right">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((evt) => {
            const investor = investorMap[evt.investor_id];
            return (
              <TableRow key={evt.id}>
                <TableCell>
                  <div className="font-medium">{formatInvestorName(investor)}</div>
                  <div className="text-xs text-muted-foreground">
                    {investor?.email || evt.investor_id}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <FinancialValue value={evt.investor_balance} asset={asset} />
                </TableCell>
                <TableCell className="text-right">
                  {formatPercentage(evt.investor_share_pct, 4)}
                </TableCell>
                <TableCell className="text-right">
                  <FinancialValue value={evt.gross_yield_amount} asset={asset} />
                </TableCell>
                <TableCell className="text-right">
                  {formatPercentage(evt.fee_pct || 0, 2)}
                </TableCell>
                <TableCell className="text-right">
                  <FinancialValue value={evt.fee_amount || 0} asset={asset} />
                </TableCell>
                <TableCell className="text-right font-semibold">
                  <FinancialValue value={evt.net_yield_amount} asset={asset} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

const distributionExportColumns: ExportColumn[] = [
  { key: "fund_name", label: "Fund" },
  { key: "purpose", label: "Purpose" },
  { key: "distribution_type", label: "Type" },
  { key: "period_end", label: "Period End" },
  { key: "effective_date", label: "Applied At" },
  { key: "gross_yield", label: "Gross Yield" },
  { key: "net_yield", label: "Net Yield" },
  { key: "total_fees", label: "Total Fees" },
  { key: "total_ib", label: "Total IB" },
  { key: "recorded_aum", label: "Recorded AUM" },
  { key: "allocation_count", label: "Investors" },
];

export function YieldDistributionsContent({ embedded = false }: { embedded?: boolean } = {}) {
  const { data: fundsData = [] } = useFunds(true);
  const funds: Fund[] = fundsData.map((f) => ({
    id: f.id,
    code: f.code,
    name: f.name,
    asset: f.asset,
  }));

  const {
    filters: urlFilters,
    setFilter,
    clearFilters,
  } = useUrlFilters({
    keys: ["fundId", "month", "purpose"],
    defaults: { fundId: "all" },
  });

  const selectedFundId = urlFilters.fundId || "all";
  const selectedMonth = urlFilters.month || "";
  const selectedPurpose = urlFilters.purpose || "all";
  const [showVoided, setShowVoided] = useState(false);

  const {
    data,
    isLoading: loading,
    dataUpdatedAt,
    refetch,
  } = useYieldDistributionsPage({
    fundId: selectedFundId,
    month: selectedMonth,
    purpose: selectedPurpose,
    includeVoided: showVoided,
  });

  const distributions = data?.distributions ?? [];
  const allocationsByDistribution = data?.allocationsByDistribution ?? {};
  const feeAllocationsByDistribution = data?.feeAllocationsByDistribution ?? {};
  const yieldEventsByDistribution = data?.yieldEventsByDistribution ?? {};
  const investorMap = data?.investorMap ?? {};

  const fundMap = useMemo(() => new Map(funds.map((fund) => [fund.id, fund])), [funds]);

  // Generate available months for the selector (last 24 months)
  const availableMonths = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const date = startOfMonth(subMonths(now, i));
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return months;
  }, []);

  const totalDistributions = distributions.length;

  // Void dialog state
  const [voidTarget, setVoidTarget] = useState<{
    id: string;
    fund_name: string;
    fund_asset: string;
    gross_yield: number;
    net_yield: number;
    total_fees: number;
    total_ib: number;
    purpose: string;
    effective_date: string;
    period_end?: string;
  } | null>(null);
  const [voidPending, setVoidPending] = useState(false);

  // Route-to-fees dialog state
  const [routeTarget, setRouteTarget] = useState<{
    id: string;
    fund_id: string;
    fund_name: string;
    fund_asset: string;
    total_fees: number;
    effective_date: string;
  } | null>(null);
  const [routePending, setRoutePending] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleVoidOpen = useCallback(
    (distribution: DistributionRow) => {
      const fund = fundMap.get(distribution.fund_id);
      setVoidTarget({
        id: distribution.id,
        fund_name: fund?.name || "Unknown",
        fund_asset: fund?.asset || "",
        gross_yield: distribution.gross_yield,
        net_yield: distribution.net_yield || 0,
        total_fees: distribution.total_fees || 0,
        total_ib: distribution.total_ib || 0,
        purpose: distribution.purpose,
        effective_date: distribution.effective_date,
        period_end: distribution.period_end,
      });
    },
    [fundMap]
  );

  const handleVoidConfirm = useCallback(
    async (distributionId: string, reason: string, voidCrystals: boolean = false) => {
      setVoidPending(true);
      try {
        await voidYieldDistribution(distributionId, reason, voidCrystals);
        toast({ title: "Distribution voided successfully" });
        setVoidTarget(null);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.yieldDistributions() });
      } catch (err) {
        toast({
          title: "Failed to void distribution",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setVoidPending(false);
      }
    },
    [queryClient, toast]
  );

  const handleRouteToFeesOpen = useCallback(
    (distribution: DistributionRow) => {
      const fund = fundMap.get(distribution.fund_id);
      setRouteTarget({
        id: distribution.id,
        fund_id: distribution.fund_id,
        fund_name: fund?.name || "Unknown",
        fund_asset: fund?.asset || "",
        total_fees: distribution.total_fees || 0,
        effective_date: distribution.effective_date,
      });
    },
    [fundMap]
  );

  const handleRouteToFeesConfirm = useCallback(async () => {
    if (!routeTarget) return;
    setRoutePending(true);
    try {
      // Route the total fee amount from this distribution to INDIGO FEES
      const allocs = allocationsByDistribution[routeTarget.id] || [];
      let routedCount = 0;

      for (const allocation of allocs) {
        const feeAmount = allocation.fee_amount || 0;
        if (feeAmount <= 0) continue;

        await executeInternalRoute({
          fromInvestorId: allocation.investor_id,
          fundId: routeTarget.fund_id,
          amount: feeAmount,
          effectiveDate: routeTarget.effective_date.split("T")[0],
          reason: `Fee routing from distribution ${routeTarget.id}`,
        });
        routedCount++;
      }

      toast({
        title: "Fees routed to INDIGO FEES",
        description: `Routed fees from ${routedCount} investor allocation(s).`,
      });
      setRouteTarget(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.yieldDistributions() });
    } catch (err) {
      toast({
        title: "Failed to route fees",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRoutePending(false);
    }
  }, [routeTarget, allocationsByDistribution, queryClient, toast]);

  // Export data enriched with fund names
  const exportData = useMemo(() => {
    return distributions.map((d) => {
      const fund = fundMap.get(d.fund_id);
      return { ...d, fund_name: fund?.name || d.fund_id };
    });
  }, [distributions, fundMap]);

  const groupedDistributions = useMemo(() => {
    const grouped: Record<string, Record<string, Record<string, DistributionRow[]>>> = {};
    distributions.forEach((distribution) => {
      const periodDate = distribution.period_end || distribution.effective_date;
      const date = new Date(periodDate);
      const yearKey = format(date, "yyyy");
      const monthKey = format(date, "MMMM");
      const fundKey = distribution.fund_id;

      if (!grouped[yearKey]) grouped[yearKey] = {};
      if (!grouped[yearKey][monthKey]) grouped[yearKey][monthKey] = {};
      if (!grouped[yearKey][monthKey][fundKey]) grouped[yearKey][monthKey][fundKey] = [];

      grouped[yearKey][monthKey][fundKey].push(distribution);
    });

    return grouped;
  }, [distributions]);

  const content = (
    <>
      {!embedded && (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Yield Distributions</h1>
          </div>
          <div className="flex items-center gap-2">
            <LastUpdated
              timestamp={dataUpdatedAt}
              onRefresh={() => refetch()}
              isRefreshing={loading}
            />
            <ExportButton
              data={exportData}
              columns={distributionExportColumns}
              filename="yield_distributions"
              disabled={loading}
            />
          </div>
        </div>
      )}

      {embedded && (
        <div className="flex items-end justify-between mb-2">
          <div className="flex items-center gap-2 ml-auto">
            <LastUpdated
              timestamp={dataUpdatedAt}
              onRefresh={() => refetch()}
              isRefreshing={loading}
            />
            <ExportButton
              data={exportData}
              columns={distributionExportColumns}
              filename="yield_distributions"
              disabled={loading}
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Fund</Label>
            <Select value={selectedFundId} onValueChange={(value) => setFilter("fundId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All funds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All funds</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    <span className="flex items-center gap-2">
                      <CryptoIcon symbol={fund.asset} className="h-4 w-4" />
                      {fund.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Month</Label>
            <Select
              value={selectedMonth || "all"}
              onValueChange={(value) => setFilter("month", value === "all" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {availableMonths.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Purpose</Label>
            <Select value={selectedPurpose} onValueChange={(value) => setFilter("purpose", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All purposes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All purposes</SelectItem>
                <SelectItem value="transaction">Transaction</SelectItem>
                <SelectItem value="reporting">Reporting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-4">
            <Button variant="outline" onClick={clearFilters} disabled={loading}>
              Clear
            </Button>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showVoided}
                onChange={(e) => setShowVoided(e.target.checked)}
                className="rounded border-white/20"
              />
              Show voided
            </label>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-muted-foreground">
              {totalDistributions} distribution{totalDistributions === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </div>

      <Accordion type="multiple" className="w-full space-y-3">
        {Object.entries(groupedDistributions).map(([year, months]) => (
          <AccordionItem key={year} value={`year-${year}`} className="border rounded-md">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex flex-1 items-center gap-3 text-left">
                <div className="text-lg font-semibold">{year}</div>
                <Badge variant="outline">
                  {Object.keys(months).length} month{Object.keys(months).length === 1 ? "" : "s"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Accordion type="multiple" className="w-full space-y-3">
                {Object.entries(months).map(([month, fundsById]) => (
                  <AccordionItem
                    key={`${year}-${month}`}
                    value={`month-${year}-${month}`}
                    className="border rounded-md"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex flex-1 items-center gap-3 text-left">
                        <div className="text-base font-semibold">{month}</div>
                        <Badge variant="outline">{Object.keys(fundsById).length} funds</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <Accordion type="multiple" className="w-full space-y-3">
                        {Object.entries(fundsById).map(([fundId, fundDistributions]) => {
                          const fund = fundMap.get(fundId);
                          return (
                            <AccordionItem
                              key={`${year}-${month}-${fundId}`}
                              value={`fund-${year}-${month}-${fundId}`}
                              className="border rounded-md"
                            >
                              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                <div className="flex flex-1 flex-wrap items-center gap-3 text-left">
                                  <div className="flex items-center gap-2">
                                    <CryptoIcon symbol={fund?.asset || ""} className="h-5 w-5" />
                                    <div>
                                      <div className="font-semibold">{fund?.name || fundId}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {fund?.asset || "Unknown asset"}
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="outline">
                                    {fundDistributions.length} distribution
                                    {fundDistributions.length === 1 ? "" : "s"}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 space-y-4">
                                {(() => {
                                  const crystalDists =
                                    fundDistributions.filter(isCrystallizationDist);
                                  if (crystalDists.length === 0) return null;
                                  const regularDists = fundDistributions.filter(
                                    (d) => !isCrystallizationDist(d)
                                  );
                                  const crystalGross = crystalDists.reduce(
                                    (s, d) => s + d.gross_yield,
                                    0
                                  );
                                  const regularGross = regularDists.reduce(
                                    (s, d) => s + d.gross_yield,
                                    0
                                  );
                                  const totalGross = crystalGross + regularGross;
                                  return (
                                    <Card className="border-purple-800/30 bg-purple-950/10">
                                      <CardContent className="py-3 px-4">
                                        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-4 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">
                                              Yield Events
                                            </span>
                                            <div className="font-medium">
                                              {crystalDists.length} event
                                              {crystalDists.length === 1 ? "" : "s"},{" "}
                                              <FinancialValue
                                                value={crystalGross}
                                                asset={fund?.asset}
                                              />{" "}
                                              gross
                                            </div>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">
                                              Reporting / Yield
                                            </span>
                                            <div className="font-medium">
                                              <FinancialValue
                                                value={regularGross}
                                                asset={fund?.asset}
                                              />{" "}
                                              gross
                                            </div>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Total</span>
                                            <div className="font-medium">
                                              <FinancialValue
                                                value={totalGross}
                                                asset={fund?.asset}
                                              />{" "}
                                              gross
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })()}
                                {fundDistributions.map((distribution) => {
                                  const allocations =
                                    allocationsByDistribution[distribution.id] || [];
                                  const feeAllocations =
                                    feeAllocationsByDistribution[distribution.id] || [];
                                  const yieldEvents =
                                    yieldEventsByDistribution[distribution.id] || [];
                                  const isCrystallization = isCrystallizationDist(distribution);
                                  const totalGross = allocations.reduce(
                                    (sum, a) => sum + (a.gross_amount || 0),
                                    0
                                  );
                                  return (
                                    <Card key={distribution.id}>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-base">
                                          <div className="flex flex-wrap items-center gap-3">
                                            <span>
                                              {distribution.period_end
                                                ? format(
                                                    new Date(distribution.period_end),
                                                    "MMM d, yyyy"
                                                  )
                                                : format(
                                                    new Date(distribution.effective_date),
                                                    "MMM d, yyyy"
                                                  )}
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className={
                                                distribution.purpose === "reporting"
                                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 uppercase tracking-wider text-[10px] font-mono"
                                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider text-[10px] font-mono"
                                              }
                                            >
                                              {distribution.purpose === "reporting"
                                                ? "Reporting"
                                                : "Transaction"}
                                            </Badge>
                                            {isCrystallizationDist(distribution) && (
                                              <Badge
                                                variant="outline"
                                                className="bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase tracking-wider text-[10px] font-mono"
                                              >
                                                {distribution.distribution_type}
                                              </Badge>
                                            )}
                                            {distribution.is_voided && (
                                              <Badge
                                                variant="destructive"
                                                className="bg-red-900/30 text-red-400"
                                              >
                                                Voided
                                              </Badge>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                              {format(
                                                new Date(distribution.effective_date),
                                                "MMM d, yyyy HH:mm"
                                              )}
                                            </span>
                                            <div className="ml-auto flex items-center gap-1">
                                              {!distribution.is_voided &&
                                                (distribution.total_fees || 0) > 0 && (
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-primary hover:text-primary hover:bg-primary/10"
                                                    onClick={() =>
                                                      handleRouteToFeesOpen(distribution)
                                                    }
                                                  >
                                                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                                                    Route to INDIGO FEES
                                                  </Button>
                                                )}
                                              {!distribution.is_voided && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                  onClick={() => handleVoidOpen(distribution)}
                                                >
                                                  <Trash2 className="h-4 w-4 mr-1" />
                                                  Void
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
                                          <Card>
                                            <CardHeader className="pb-2">
                                              <CardTitle className="text-base">
                                                Distribution summary
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2 text-sm">
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Gross</span>
                                                <FinancialValue
                                                  value={distribution.gross_yield}
                                                  asset={fund?.asset}
                                                />
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Fees</span>
                                                <FinancialValue
                                                  value={distribution.total_fees || 0}
                                                  asset={fund?.asset}
                                                />
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">IB</span>
                                                <FinancialValue
                                                  value={distribution.total_ib || 0}
                                                  asset={fund?.asset}
                                                />
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Net</span>
                                                <FinancialValue
                                                  value={distribution.net_yield || 0}
                                                  asset={fund?.asset}
                                                />
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                  Recorded AUM
                                                </span>
                                                <FinancialValue
                                                  value={distribution.recorded_aum}
                                                  asset={fund?.asset}
                                                />
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                  Investors
                                                </span>
                                                <span>
                                                  {distribution.allocation_count ??
                                                    allocations.length}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                  Total Gross
                                                </span>
                                                <span>
                                                  {formatAssetValue(totalGross, fund?.asset || "")}
                                                </span>
                                              </div>
                                              {(() => {
                                                const sj = distribution.summary_json as {
                                                  version?: string;
                                                  opening_aum?: number;
                                                } | null;
                                                if (!sj?.version) return null;

                                                return (
                                                  <>
                                                    <div className="border-t border-border my-2" />
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">
                                                        Engine
                                                      </span>
                                                      <span className="uppercase text-xs">
                                                        {sj.version}
                                                      </span>
                                                    </div>
                                                    {sj.opening_aum != null && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                          Opening AUM
                                                        </span>
                                                        <FinancialValue
                                                          value={sj.opening_aum}
                                                          asset={fund?.asset}
                                                        />
                                                      </div>
                                                    )}
                                                    {distribution.recorded_aum != null && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                          Recorded AUM
                                                        </span>
                                                        <FinancialValue
                                                          value={distribution.recorded_aum}
                                                          asset={fund?.asset}
                                                        />
                                                      </div>
                                                    )}
                                                    {distribution.recorded_aum != null &&
                                                      sj.opening_aum != null &&
                                                      sj.opening_aum > 0 && (
                                                        <div className="flex justify-between">
                                                          <span className="text-muted-foreground">
                                                            Yield %
                                                          </span>
                                                          <span>
                                                            {formatPercentage(
                                                              ((Number(distribution.recorded_aum) -
                                                                sj.opening_aum) /
                                                                sj.opening_aum) *
                                                                100,
                                                              2
                                                            )}
                                                          </span>
                                                        </div>
                                                      )}
                                                  </>
                                                );
                                              })()}
                                              {isCrystallization && yieldEvents.length > 0 && (
                                                <>
                                                  <div className="border-t border-border my-2" />
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                      Trigger
                                                    </span>
                                                    <span className="capitalize">
                                                      {distribution.distribution_type}
                                                    </span>
                                                  </div>
                                                  {yieldEvents[0].period_start && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">
                                                        Period
                                                      </span>
                                                      <span>
                                                        {format(
                                                          new Date(yieldEvents[0].period_start),
                                                          "MMM d"
                                                        )}{" "}
                                                        -{" "}
                                                        {yieldEvents[0].period_end
                                                          ? format(
                                                              new Date(yieldEvents[0].period_end),
                                                              "MMM d, yyyy"
                                                            )
                                                          : ""}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {yieldEvents[0].fund_aum_before != null && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">
                                                        Opening AUM
                                                      </span>
                                                      <FinancialValue
                                                        value={yieldEvents[0].fund_aum_before}
                                                        asset={fund?.asset}
                                                      />
                                                    </div>
                                                  )}
                                                  {yieldEvents[0].fund_aum_after != null && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">
                                                        Closing AUM
                                                      </span>
                                                      <FinancialValue
                                                        value={yieldEvents[0].fund_aum_after}
                                                        asset={fund?.asset}
                                                      />
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                            </CardContent>
                                          </Card>

                                          <Card>
                                            <CardHeader className="pb-2">
                                              <CardTitle className="text-base">
                                                Allocation breakdown
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent className="overflow-x-auto">
                                              {allocations.length > 0 ? (
                                                <Table className="text-xs">
                                                  <TableHeader className="sticky top-0 bg-card z-10">
                                                    <TableRow>
                                                      <TableHead className="min-w-[120px]">
                                                        Investor
                                                      </TableHead>
                                                      <TableHead className="text-right whitespace-nowrap">
                                                        Share%
                                                      </TableHead>
                                                      <TableHead className="text-right whitespace-nowrap">
                                                        Gross
                                                      </TableHead>
                                                      <TableHead className="text-right whitespace-nowrap">
                                                        Fee%
                                                      </TableHead>
                                                      <TableHead className="text-right whitespace-nowrap">
                                                        Fee
                                                      </TableHead>
                                                      <TableHead className="text-right whitespace-nowrap">
                                                        IB%
                                                      </TableHead>
                                                      <TableHead className="text-right whitespace-nowrap">
                                                        IB
                                                      </TableHead>
                                                      <TableHead className="text-right whitespace-nowrap">
                                                        Net
                                                      </TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {allocations.map((allocation) => {
                                                      const investor =
                                                        investorMap[allocation.investor_id];
                                                      return (
                                                        <TableRow key={allocation.id}>
                                                          <TableCell className="py-1.5">
                                                            <div className="font-medium truncate max-w-[140px]">
                                                              {formatInvestorName(investor)}
                                                            </div>
                                                          </TableCell>
                                                          <TableCell className="text-right py-1.5 tabular-nums">
                                                            {formatPercentage(
                                                              totalGross !== 0
                                                                ? ((allocation.gross_amount || 0) /
                                                                    totalGross) *
                                                                    100
                                                                : 0,
                                                              2
                                                            )}
                                                          </TableCell>
                                                          <TableCell className="text-right py-1.5 tabular-nums">
                                                            <FinancialValue
                                                              value={allocation.gross_amount}
                                                              asset={fund?.asset}
                                                            />
                                                          </TableCell>
                                                          <TableCell className="text-right py-1.5 tabular-nums">
                                                            {formatPercentage(
                                                              allocation.fee_pct || 0,
                                                              1
                                                            )}
                                                          </TableCell>
                                                          <TableCell className="text-right py-1.5 tabular-nums">
                                                            <FinancialValue
                                                              value={allocation.fee_amount || 0}
                                                              asset={fund?.asset}
                                                            />
                                                          </TableCell>
                                                          <TableCell className="text-right py-1.5 tabular-nums">
                                                            {formatPercentage(
                                                              allocation.ib_pct || 0,
                                                              1
                                                            )}
                                                          </TableCell>
                                                          <TableCell className="text-right py-1.5 tabular-nums">
                                                            <FinancialValue
                                                              value={allocation.ib_amount || 0}
                                                              asset={fund?.asset}
                                                            />
                                                          </TableCell>
                                                          <TableCell className="text-right py-1.5 font-semibold tabular-nums">
                                                            <FinancialValue
                                                              value={allocation.net_amount}
                                                              asset={fund?.asset}
                                                            />
                                                          </TableCell>
                                                        </TableRow>
                                                      );
                                                    })}
                                                  </TableBody>
                                                </Table>
                                              ) : feeAllocations.length > 0 ? (
                                                <FeeAllocationsTable
                                                  feeAllocations={feeAllocations}
                                                  investorMap={investorMap}
                                                  asset={fund?.asset || ""}
                                                />
                                              ) : yieldEvents.length > 0 ? (
                                                <CrystallizationEventsTable
                                                  events={yieldEvents}
                                                  investorMap={investorMap}
                                                  asset={fund?.asset || ""}
                                                />
                                              ) : (
                                                <div className="text-center py-6 text-sm text-muted-foreground">
                                                  No per-investor allocation data available for this
                                                  distribution.
                                                </div>
                                              )}
                                            </CardContent>
                                          </Card>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <VoidDistributionDialog
        distribution={voidTarget}
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null);
        }}
        onConfirm={handleVoidConfirm}
        isPending={voidPending}
      />

      {/* Route to INDIGO FEES Confirmation Dialog */}
      <AlertDialog
        open={routeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRouteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Route Fees to INDIGO FEES
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-3">
              <p>
                This will route the collected fees from this distribution to the{" "}
                <strong>INDIGO FEES</strong> account via internal transfers.
              </p>
              {routeTarget && (
                <div className="bg-muted rounded-md p-3 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Fund:</span>{" "}
                    <span className="font-medium">{routeTarget.fund_name}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Total Fees:</span>{" "}
                    <span className="font-medium">
                      {formatAssetValue(routeTarget.total_fees, routeTarget.fund_asset)}{" "}
                      {routeTarget.fund_asset.toUpperCase()}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Date:</span>{" "}
                    <span className="font-medium">
                      {format(new Date(routeTarget.effective_date), "MMM d, yyyy")}
                    </span>
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                This creates paired INTERNAL_WITHDRAWAL and INTERNAL_CREDIT transactions per
                investor, hidden from investor view.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={routePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRouteToFeesConfirm();
              }}
              disabled={routePending}
              className="bg-primary hover:bg-primary/90"
            >
              {routePending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Route to INDIGO FEES"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }

  return <PageShell maxWidth="wide">{content}</PageShell>;
}

export default function YieldDistributionsPage() {
  return (
    <AdminGuard>
      <YieldDistributionsContent />
    </AdminGuard>
  );
}
