/**
 * Yield Distributions Admin Page
 * Monthly distribution overview with per-investor ADB + allocation breakdown
 */

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AdminGuard } from "@/components/admin";
import { useFunds, useUrlFilters } from "@/hooks";
import { supabase } from "@/integrations/supabase/client";
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

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

type DistributionRow = {
  id: string;
  fund_id: string;
  yield_date: string | null;
  period_start: string | null;
  period_end: string | null;
  effective_date: string;
  purpose: "reporting" | "transaction";
  gross_yield: number;
  total_fees: number | null;
  total_ib: number | null;
  net_yield: number | null;
  recorded_aum: number;
  allocation_count: number | null;
  created_at: string;
  is_voided: boolean | null;
  summary_json: unknown | null;
};

type AllocationRow = {
  id: string;
  distribution_id: string;
  investor_id: string;
  gross_amount: number;
  fee_amount: number | null;
  ib_amount: number | null;
  net_amount: number;
  adb_share: number | null;
  ownership_pct: number | null;
  fee_pct: number | null;
  ib_pct: number | null;
  position_value_at_calc: number | null;
};

type InvestorProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

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

  const [loading, setLoading] = useState(false);
  const [distributions, setDistributions] = useState<DistributionRow[]>([]);
  const [allocationsByDistribution, setAllocationsByDistribution] = useState<
    Record<string, AllocationRow[]>
  >({});
  const [investorMap, setInvestorMap] = useState<Record<string, InvestorProfile>>({});

  const selectedFundId = urlFilters.fundId || "all";
  const selectedMonth = urlFilters.month || "";

  const fundMap = useMemo(() => new Map(funds.map((fund) => [fund.id, fund])), [funds]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("yield_distributions")
        .select(
          `
          id,
          fund_id,
          yield_date,
          period_start,
          period_end,
          effective_date,
          purpose,
          gross_yield,
          total_fees,
          total_ib,
          net_yield,
          recorded_aum,
          allocation_count,
          created_at,
          is_voided,
          summary_json
        `
        )
        .eq("is_voided", false)
        .order("effective_date", { ascending: false })
        .limit(120);

      if (selectedFundId !== "all") {
        query = query.eq("fund_id", selectedFundId);
      }

      if (selectedMonth) {
        query = query.gte("effective_date", `${selectedMonth}-01`);
        query = query.lt("effective_date", `${selectedMonth}-32`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data || []) as DistributionRow[];
      setDistributions(rows);

      const distributionIds = rows.map((row) => row.id);
      if (distributionIds.length === 0) {
        setAllocationsByDistribution({});
        setInvestorMap({});
        return;
      }

      const { data: allocationRows, error: allocationError } = await supabase
        .from("yield_allocations")
        .select(
          `
          id,
          distribution_id,
          investor_id,
          gross_amount,
          fee_amount,
          ib_amount,
          net_amount,
          adb_share,
          ownership_pct,
          fee_pct,
          ib_pct,
          position_value_at_calc
        `
        )
        .in("distribution_id", distributionIds)
        .eq("is_voided", false);

      if (allocationError) throw allocationError;

      const allocations = (allocationRows || []) as AllocationRow[];
      const grouped: Record<string, AllocationRow[]> = {};
      allocations.forEach((allocation) => {
        if (!grouped[allocation.distribution_id]) {
          grouped[allocation.distribution_id] = [];
        }
        grouped[allocation.distribution_id].push(allocation);
      });
      setAllocationsByDistribution(grouped);

      const investorIds = Array.from(new Set(allocations.map((a) => a.investor_id)));
      if (investorIds.length === 0) {
        setInvestorMap({});
        return;
      }

      const { data: investors, error: investorError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", investorIds);

      if (investorError) throw investorError;

      const map: Record<string, InvestorProfile> = {};
      (investors || []).forEach((profile) => {
        map[profile.id] = profile as InvestorProfile;
      });
      setInvestorMap(map);
    } catch (error) {
      console.error("Failed to load yield distributions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedFundId, selectedMonth]);

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
                <Badge variant="outline">{Object.keys(months).length} months</Badge>
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
                                      <CardContent className="grid gap-4 lg:grid-cols-3">
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
                                                  <TableHead className="text-right">ADB</TableHead>
                                                  <TableHead className="text-right">
                                                    Ownership
                                                  </TableHead>
                                                  <TableHead className="text-right">
                                                    Gross
                                                  </TableHead>
                                                  <TableHead className="text-right">
                                                    Fee %
                                                  </TableHead>
                                                  <TableHead className="text-right">Fee</TableHead>
                                                  <TableHead className="text-right">IB %</TableHead>
                                                  <TableHead className="text-right">IB</TableHead>
                                                  <TableHead className="text-right">Net</TableHead>
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
