/**
 * Investor Yield History Page
 * Shows all finalized yield events visible to the investor
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/services/auth";
import { PageHeader } from "@/components/layout";
import { PageShell } from "@/components/layout/PageShell";
import {
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
} from "@/features/investor/performance/hooks/useInvestorYield";
import { format, getYear, getMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { parseFinancial } from "@/utils/financial";
import { formatInvestorNumber } from "@/utils/assets";
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

  const isLoading = eventsLoading || cumulativeLoading;

  return (
    <PageShell maxWidth="narrow">
      <PageHeader
        title="Yield History"
        subtitle="Your finalized yield earnings across all funds"
        icon={TrendingUp}
      />

      {/* Cumulative Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4">
          <div className="flex items-center gap-3">
            <Coins className="h-8 w-8 text-emerald-500/30" />
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
                      <p
                        className={cn(
                          "text-lg font-mono font-bold",
                          fund.totalNetYield >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {fund.totalNetYield >= 0 ? "+" : ""}
                        {formatInvestorNumber(fund.totalNetYield)} {fund.fundAsset}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4">
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
        </div>
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
        <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-8 text-center text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No yield history found</p>
          <p className="text-sm mt-1">
            Yield will appear here after monthly distributions are finalized
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthGroups.map((group) => (
            <MonthSection key={`${group.year}-${group.month}`} group={group} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function MonthSection({ group }: { group: MonthGroup }) {
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
      fg.totals.gross = parseFinancial(fg.totals.gross)
        .plus(parseFinancial(e.gross_yield_amount))
        .toNumber();
      fg.totals.fees = parseFinancial(fg.totals.fees).plus(parseFinancial(e.fee_amount)).toNumber();
      fg.totals.net = parseFinancial(fg.totals.net)
        .plus(parseFinancial(e.net_yield_amount))
        .toNumber();
    });

    return Array.from(map.values());
  }, [group.events]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
        <CollapsibleTrigger className="w-full">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    !isOpen && "-rotate-90"
                  )}
                />
                <span className="text-lg font-semibold">{group.label}</span>
                <Badge variant="secondary">{group.events.length} events</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {fundGroups.map((fg) => (
                  <div key={fg.fund.id} className="text-right flex items-center gap-1.5">
                    <CryptoIcon symbol={fg.fund.asset} className="h-4 w-4" />
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        fg.totals.net >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {fg.totals.net >= 0 ? "+" : ""}
                      {formatInvestorNumber(fg.totals.net)} {fg.fund.asset}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {fundGroups.map((fg) => (
              <div key={fg.fund.id} className="border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CryptoIcon symbol={fg.fund.asset} className="h-6 w-6" />
                    <span className="font-medium">{fg.fund.name}</span>
                    <Badge variant="outline">{fg.fund.asset}</Badge>
                  </div>
                  <div className="text-sm text-right">
                    <span className="text-muted-foreground">Net: </span>
                    <span
                      className={cn(
                        "font-mono",
                        fg.totals.net >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {fg.totals.net >= 0 ? "+" : ""}
                      {formatInvestorNumber(fg.totals.net)}
                    </span>
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
                          {e.investor_balance > 0 ? formatInvestorNumber(e.investor_balance) : "--"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {(e.fund_yield_pct ?? 0) !== 0 ? `${e.fund_yield_pct.toFixed(2)}%` : "--"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono font-semibold",
                            e.net_yield_amount >= 0 ? "text-emerald-400" : "text-rose-400"
                          )}
                        >
                          {e.net_yield_amount >= 0 ? "+" : ""}
                          {formatInvestorNumber(e.net_yield_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
