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
} from "@/services/admin/yieldDistributionsPageService";
import { FinancialValue } from "@/components/common/FinancialValue";
import { ExportButton } from "@/components/common/ExportButton";
import { LastUpdated } from "@/components/common/LastUpdated";
import { VoidDistributionDialog } from "@/features/admin/yields/components/VoidDistributionDialog";
import { voidYieldDistribution } from "@/services/admin/yieldManagementService";
import { formatAssetValue, formatPercentage } from "@/utils/formatters";
import type { ExportColumn } from "@/lib/export/csv-export";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
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
      <p className="text-xs text-muted-foreground mb-3">
        Showing fee allocation data (yield_allocations not available for this distribution).
      </p>
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
      <p className="text-xs text-muted-foreground mb-3">
        Crystallization yield events (per-investor breakdown from investor_yield_events).
      </p>
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

function YieldDistributionsContent() {
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

  return (
    <PageShell maxWidth="wide">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Yield Distributions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monthly distribution ledger with per-investor allocation breakdown.
          </p>
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
                                              Crystallized
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
                                  const grossDiscrepancy = Math.abs(
                                    totalGross - distribution.gross_yield
                                  );
                                  const hasDiscrepancy =
                                    allocations.length > 0 && grossDiscrepancy > 0.01;
                                  const sumGrossEvents = yieldEvents.reduce(
                                    (sum, e) => sum + (e.gross_yield_amount || 0),
                                    0
                                  );
                                  const eventDiscrepancy = Math.abs(
                                    sumGrossEvents - distribution.gross_yield
                                  );
                                  const hasEventDiscrepancy =
                                    yieldEvents.length > 0 && eventDiscrepancy > 0.01;
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
                                              variant={
                                                distribution.purpose === "reporting"
                                                  ? "default"
                                                  : "secondary"
                                              }
                                              className={
                                                distribution.purpose === "reporting"
                                                  ? "bg-green-900/30 text-green-400"
                                                  : "bg-orange-900/30 text-orange-400"
                                              }
                                            >
                                              {distribution.purpose === "reporting"
                                                ? "Reporting"
                                                : "Transaction"}
                                            </Badge>
                                            {isCrystallizationDist(distribution) && (
                                              <Badge
                                                variant="outline"
                                                className="bg-purple-900/30 text-purple-400 border-purple-800"
                                              >
                                                Crystallization ({distribution.distribution_type})
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
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                                              onClick={() => handleVoidOpen(distribution)}
                                            >
                                              <Trash2 className="h-4 w-4 mr-1" />
                                              Void
                                            </Button>
                                          </div>
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        {(hasDiscrepancy || hasEventDiscrepancy) && (
                                          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-950/20 text-amber-400 text-sm border border-amber-800">
                                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            <div>
                                              <strong>Reconciliation Warning:</strong> Sum of gross{" "}
                                              {allocations.length > 0 ? "allocations" : "events"} (
                                              <FinancialValue
                                                value={
                                                  allocations.length > 0
                                                    ? totalGross
                                                    : sumGrossEvents
                                                }
                                                asset={fund?.asset}
                                              />
                                              ) does not match distribution gross yield (
                                              <FinancialValue
                                                value={distribution.gross_yield}
                                                asset={fund?.asset}
                                              />
                                              ). Discrepancy:{" "}
                                              <FinancialValue
                                                value={
                                                  allocations.length > 0
                                                    ? grossDiscrepancy
                                                    : eventDiscrepancy
                                                }
                                                asset={fund?.asset}
                                              />
                                            </div>
                                          </div>
                                        )}
                                        {((allocations.length > 0 && !hasDiscrepancy) ||
                                          (allocations.length === 0 &&
                                            yieldEvents.length > 0 &&
                                            !hasEventDiscrepancy)) && (
                                          <div className="flex items-center gap-2 p-2 rounded-md bg-green-950/20 text-green-400 text-xs border border-green-800">
                                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                                            <span>
                                              {allocations.length > 0
                                                ? "Allocations reconcile with gross yield"
                                                : "Crystallization events reconcile with gross yield"}
                                            </span>
                                          </div>
                                        )}
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
                                                  crystals_consolidated?: number;
                                                  segments?: Array<{
                                                    start: string;
                                                    end: string;
                                                    yield: number;
                                                    closing_aum: number;
                                                    seg_idx: number;
                                                    skipped: boolean;
                                                    investors: number;
                                                  }>;
                                                } | null;
                                                if (!sj?.version) return null;
                                                const seg = sj.segments?.[0];
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
                                                    {seg && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                          Closing AUM
                                                        </span>
                                                        <FinancialValue
                                                          value={seg.closing_aum}
                                                          asset={fund?.asset}
                                                        />
                                                      </div>
                                                    )}
                                                    {seg &&
                                                      sj.opening_aum != null &&
                                                      sj.opening_aum > 0 && (
                                                        <div className="flex justify-between">
                                                          <span className="text-muted-foreground">
                                                            Yield %
                                                          </span>
                                                          <span>
                                                            {formatPercentage(
                                                              ((seg.closing_aum - sj.opening_aum) /
                                                                sj.opening_aum) *
                                                                100,
                                                              2
                                                            )}
                                                          </span>
                                                        </div>
                                                      )}
                                                    {(sj.segments?.length ?? 0) > 1 && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                          Segments
                                                        </span>
                                                        <span>{sj.segments?.length}</span>
                                                      </div>
                                                    )}
                                                    {(sj.crystals_consolidated ?? 0) > 0 && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                          Crystals Consolidated
                                                        </span>
                                                        <span>{sj.crystals_consolidated}</span>
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
    </PageShell>
  );
}

export default function YieldDistributionsPage() {
  return (
    <AdminGuard>
      <YieldDistributionsContent />
    </AdminGuard>
  );
}
