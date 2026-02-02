/**
 * Yield Distributions Admin Page
 * Monthly distribution overview with per-investor ADB + allocation breakdown
 */

import { useMemo } from "react";
import { format } from "date-fns";
import { AdminGuard } from "@/components/admin";
import { useFunds, useUrlFilters } from "@/hooks";
import { useYieldDistributionsPage } from "@/features/admin/yields/hooks/useYieldDistributionsPage";
import type {
  InvestorProfile,
  DistributionRow,
} from "@/services/admin/yieldDistributionsPageService";
import { FinancialValue } from "@/components/common/FinancialValue";
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
  Input,
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
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatPercentage } from "@/utils/formatters";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

function formatInvestorName(profile?: InvestorProfile | null): string {
  if (!profile) return "Unknown";
  const full = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  return full || profile.email || "Unknown";
}

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
    keys: ["fundId", "month"],
    defaults: { fundId: "all" },
  });

  const selectedFundId = urlFilters.fundId || "all";
  const selectedMonth = urlFilters.month || "";

  const { data, isLoading: loading } = useYieldDistributionsPage({
    fundId: selectedFundId,
    month: selectedMonth,
  });

  const distributions = data?.distributions ?? [];
  const allocationsByDistribution = data?.allocationsByDistribution ?? {};
  const investorMap = data?.investorMap ?? {};

  const fundMap = useMemo(() => new Map(funds.map((fund) => [fund.id, fund])), [funds]);

  const totalDistributions = distributions.length;

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
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Yield Distributions</h1>
        <p className="text-muted-foreground mt-1">
          Monthly distribution ledger with per-investor ADB ownership and allocation math.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    {fund.name} ({fund.asset})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Month (YYYY-MM)</Label>
            <Input
              value={selectedMonth}
              placeholder="2025-09"
              onChange={(event) => setFilter("month", event.target.value)}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={clearFilters} disabled={loading}>
              Clear
            </Button>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-muted-foreground">
              {totalDistributions} distribution{totalDistributions === 1 ? "" : "s"}
            </div>
          </div>
        </CardContent>
      </Card>

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
                                {fundDistributions.map((distribution) => {
                                  const allocations =
                                    allocationsByDistribution[distribution.id] || [];
                                  const totalAdb = allocations.reduce(
                                    (sum, a) => sum + (a.adb_share || 0),
                                    0
                                  );
                                  const sumGrossAllocations = allocations.reduce(
                                    (sum, a) => sum + (a.gross_amount || 0),
                                    0
                                  );
                                  const grossDiscrepancy = Math.abs(
                                    sumGrossAllocations - distribution.gross_yield
                                  );
                                  const hasDiscrepancy =
                                    allocations.length > 0 && grossDiscrepancy > 0.01;
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
                                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                              }
                                            >
                                              {distribution.purpose === "reporting"
                                                ? "🟢 Reporting"
                                                : "🟠 Transaction"}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                              {format(
                                                new Date(distribution.effective_date),
                                                "MMM d, yyyy HH:mm"
                                              )}
                                            </span>
                                          </div>
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        {hasDiscrepancy && (
                                          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm border border-amber-200 dark:border-amber-800">
                                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            <div>
                                              <strong>Allocation Reconciliation Warning:</strong>{" "}
                                              Sum of gross allocations (
                                              <FinancialValue
                                                value={sumGrossAllocations}
                                                asset={fund?.asset}
                                              />
                                              ) does not match distribution gross yield (
                                              <FinancialValue
                                                value={distribution.gross_yield}
                                                asset={fund?.asset}
                                              />
                                              ). Discrepancy:{" "}
                                              <FinancialValue
                                                value={grossDiscrepancy}
                                                asset={fund?.asset}
                                              />
                                            </div>
                                          </div>
                                        )}
                                        {allocations.length > 0 && !hasDiscrepancy && (
                                          <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs border border-green-200 dark:border-green-800">
                                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                                            <span>Allocations reconcile with gross yield</span>
                                          </div>
                                        )}
                                        <div className="grid gap-4 lg:grid-cols-3">
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
                                                  Total ADB
                                                </span>
                                                <span>{totalAdb.toFixed(6)}</span>
                                              </div>
                                            </CardContent>
                                          </Card>

                                          <Card className="lg:col-span-2">
                                            <CardHeader className="pb-2">
                                              <CardTitle className="text-base">
                                                Allocation breakdown
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent className="overflow-auto">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead>Investor</TableHead>
                                                    <TableHead className="text-right">
                                                      ADB
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                      Ownership
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                      Gross
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                      Fee %
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                      Fee
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                      IB %
                                                    </TableHead>
                                                    <TableHead className="text-right">IB</TableHead>
                                                    <TableHead className="text-right">
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
                                                        <TableCell>
                                                          <div className="font-medium">
                                                            {formatInvestorName(investor)}
                                                          </div>
                                                          <div className="text-xs text-muted-foreground">
                                                            {investor?.email ||
                                                              allocation.investor_id}
                                                          </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                          {(allocation.adb_share || 0).toFixed(6)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                          {formatPercentage(
                                                            (allocation.ownership_pct || 0) * 100,
                                                            4
                                                          )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                          <FinancialValue
                                                            value={allocation.gross_amount}
                                                            asset={fund?.asset}
                                                          />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                          {formatPercentage(
                                                            allocation.fee_pct || 0,
                                                            2
                                                          )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                          <FinancialValue
                                                            value={allocation.fee_amount || 0}
                                                            asset={fund?.asset}
                                                          />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                          {formatPercentage(
                                                            allocation.ib_pct || 0,
                                                            2
                                                          )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                          <FinancialValue
                                                            value={allocation.ib_amount || 0}
                                                            asset={fund?.asset}
                                                          />
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">
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
    </div>
  );
}

export default function YieldDistributionsPage() {
  return (
    <AdminGuard>
      <YieldDistributionsContent />
    </AdminGuard>
  );
}
