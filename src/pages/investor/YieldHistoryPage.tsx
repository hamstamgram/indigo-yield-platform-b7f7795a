/**
 * Investor Yield History Page
 * Shows all finalized yield events visible to the investor
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/services/auth";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui";
import { TrendingUp, ChevronDown, Coins, Calendar } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  useInvestorYieldEvents,
  useInvestorCumulativeYield,
} from "@/hooks/data/investor/useInvestorYield";
import { format, getYear, getMonth } from "date-fns";
import { cn } from "@/lib/utils";
import type {
  InvestorYieldEvent,
  CumulativeYieldByFund,
} from "@/services/investor/investorYieldService";

type MonthGroup = {
  year: number;
  month: number;
  label: string;
  events: InvestorYieldEvent[];
};

export default function YieldHistoryPage() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedFund, setSelectedFund] = useState<string>("all");

  // Fetch yield events
  const { data: events = [], isLoading: eventsLoading } = useInvestorYieldEvents(
    user?.id || null,
    selectedYear !== "all" ? parseInt(selectedYear) : undefined
  );

  // Fetch cumulative totals
  const { data: cumulative, isLoading: cumulativeLoading } = useInvestorCumulativeYield(
    user?.id || null
  );

  // Get available years and funds for filters
  const { years, funds } = useMemo(() => {
    const yearSet = new Set<number>();
    const fundMap = new Map<string, { id: string; name: string; asset: string }>();

    events.forEach((e) => {
      yearSet.add(getYear(new Date(e.event_date)));
      const fundData = e.fund;
      if (fundData && !fundMap.has(e.fund_id)) {
        fundMap.set(e.fund_id, { id: e.fund_id, name: fundData.name, asset: fundData.asset });
      }
    });

    return {
      years: Array.from(yearSet).sort((a, b) => b - a),
      funds: Array.from(fundMap.values()),
    };
  }, [events]);

  // Filter and group events by month
  const monthGroups = useMemo(() => {
    const filtered = events.filter((e) => {
      if (selectedFund !== "all" && e.fund_id !== selectedFund) return false;
      return true;
    });

    // Group by year-month
    const groups = new Map<string, MonthGroup>();

    filtered.forEach((e) => {
      const date = new Date(e.event_date);
      const year = getYear(date);
      const month = getMonth(date);
      const key = `${year}-${month}`;

      if (!groups.has(key)) {
        groups.set(key, {
          year,
          month,
          label: format(date, "MMMM yyyy"),
          events: [],
        });
      }

      groups.get(key)!.events.push(e);
    });

    // Sort by date descending
    return Array.from(groups.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [events, selectedFund]);

  const formatValue = (value: number, decimals = 6) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  const isLoading = eventsLoading || cumulativeLoading;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Yield History"
        subtitle="Your finalized yield earnings across all funds"
        icon={TrendingUp}
      />

      {/* Cumulative Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-green-500/30" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total Yield Earned</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-24" />
                ) : (cumulative?.byFund || []).length === 0 ? (
                  <p className="text-2xl font-mono font-bold text-muted-foreground">--</p>
                ) : (
                  <div className="space-y-1">
                    {(cumulative?.byFund || []).map((fund: CumulativeYieldByFund) => (
                      <div key={fund.fundId} className="flex items-center gap-2">
                        <CryptoIcon symbol={fund.fundAsset} className="h-4 w-4" />
                        <p className="text-lg font-mono font-bold text-green-600">
                          +{formatValue(fund.totalNetYield)} {fund.fundAsset}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-muted-foreground/30" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">Yield Events</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-2xl font-mono font-bold">{cumulative?.eventCount || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedFund} onValueChange={setSelectedFund}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Funds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Funds</SelectItem>
            {funds.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                <span className="flex items-center gap-2">
                  <CryptoIcon symbol={f.asset} className="h-4 w-4" />
                  {f.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Groups */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : monthGroups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No yield history found</p>
            <p className="text-sm mt-1">
              Yield will appear here after monthly distributions are finalized
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {monthGroups.map((group) => (
            <MonthSection
              key={`${group.year}-${group.month}`}
              group={group}
              formatValue={formatValue}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MonthSection({
  group,
  formatValue,
}: {
  group: MonthGroup;
  formatValue: (v: number, d?: number) => string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  // Group events by fund within month
  const fundGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        fund: { id: string; name: string; asset: string };
        events: InvestorYieldEvent[];
        totals: { gross: number; fees: number; net: number };
      }
    >();

    group.events.forEach((e) => {
      const fundData = e.fund;
      if (!map.has(e.fund_id)) {
        map.set(e.fund_id, {
          fund: {
            id: e.fund_id,
            name: fundData?.name || "Unknown",
            asset: fundData?.asset || "USD",
          },
          events: [],
          totals: { gross: 0, fees: 0, net: 0 },
        });
      }
      const fg = map.get(e.fund_id)!;
      fg.events.push(e);
      fg.totals.gross += e.gross_yield_amount;
      fg.totals.fees += e.fee_amount;
      fg.totals.net += e.net_yield_amount;
    });

    return Array.from(map.values());
  }, [group.events]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    !isOpen && "-rotate-90"
                  )}
                />
                <CardTitle className="text-lg">{group.label}</CardTitle>
                <Badge variant="secondary">{group.events.length} events</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {fundGroups.map((fg) => (
                  <div key={fg.fund.id} className="text-right flex items-center gap-1.5">
                    <CryptoIcon symbol={fg.fund.asset} className="h-4 w-4" />
                    <span className="font-mono font-semibold text-green-600">
                      +{formatValue(fg.totals.net)} {fg.fund.asset}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {fundGroups.map((fg) => (
              <div key={fg.fund.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CryptoIcon symbol={fg.fund.asset} className="h-6 w-6" />
                    <span className="font-medium">{fg.fund.name}</span>
                    <Badge variant="outline">{fg.fund.asset}</Badge>
                  </div>
                  <div className="text-sm text-right">
                    <span className="text-muted-foreground">Net: </span>
                    <span className="font-mono text-green-600">+{formatValue(fg.totals.net)}</span>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Yield %</TableHead>
                      <TableHead className="text-right">Yield Earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fg.events.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{format(new Date(e.event_date), "MMM d")}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {e.period_start && e.period_end
                            ? `${format(new Date(e.period_start), "MMM d")} - ${format(new Date(e.period_end), "MMM d")}`
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {e.investor_balance > 0 ? formatValue(e.investor_balance) : "--"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {(e.fund_yield_pct ?? 0) > 0
                            ? `${(e.fund_yield_pct * 100).toFixed(2)}%`
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600 font-semibold">
                          +{formatValue(e.net_yield_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
