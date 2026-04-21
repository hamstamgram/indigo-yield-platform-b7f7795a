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
import Decimal from "decimal.js";
import { formatInvestorNumber } from "@/utils/assets";
import type {
  InvestorYieldEvent,
  CumulativeYieldByFund,
} from "@/features/investor/yields/services/investorYieldService";

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
            <Coins className="h-8 w-8 text-yield/30" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Yield Earned</p>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (cumulative?.byFund || []).length === 0 ? (
                <p className="text-2xl font-mono font-bold text-muted-foreground">--</p>
              ) : (
                <div className="space-y-1">
                  {(cumulative?.byFund || []).map((fund: CumulativeYieldByFund) => (
                    <div key={fund.fundId} className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={fund.fundAsset} className="h-4 w-4" />
                        <p
                          className={cn(
                            "text-lg font-mono font-bold",
                            fund.totalNetYield >= 0 ? "text-yield" : "text-rose-400"
                          )}
                        >
                          {fund.totalNetYield >= 0 ? "+" : ""}
                          {formatInvestorNumber(fund.totalNetYield)} {fund.fundAsset}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Gross: {formatInvestorNumber(fund.totalGrossYield)} | Fees: -
                        {formatInvestorNumber(fund.totalFees)}
                        {fund.totalIB > 0 && ` | IB: -${formatInvestorNumber(fund.totalIB)}`}
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

  // Group events by fund within month, separating month_end from aggregations
  const fundGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        fund: { id: string; name: string; asset: string };
        monthEndEvent: InvestorYieldEvent | null;
        transactionEvents: InvestorYieldEvent[];
        totals: { gross: Decimal; fees: Decimal; ib: Decimal; net: Decimal };
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
          monthEndEvent: null,
          transactionEvents: [],
          totals: {
            gross: new Decimal(0),
            fees: new Decimal(0),
            ib: new Decimal(0),
            net: new Decimal(0),
          },
        });
      }
      const fg = map.get(e.fund_id)!;

      if (e.trigger_type === "month_end") {
        fg.monthEndEvent = e;
      } else {
        fg.transactionEvents.push(e);
      }

      fg.totals.gross = fg.totals.gross.plus(parseFinancial(e.gross_yield_amount));
      fg.totals.fees = fg.totals.fees.plus(parseFinancial(e.fee_amount));
      fg.totals.ib = fg.totals.ib.plus(parseFinancial(e.ib_amount));
      fg.totals.net = fg.totals.net.plus(parseFinancial(e.net_yield_amount));
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
                        fg.totals.net.gte(0) ? "text-yield" : "text-rose-400"
                      )}
                    >
                      {fg.totals.net.gte(0) ? "+" : ""}
                      {formatInvestorNumber(fg.totals.net.toNumber())} {fg.fund.asset}
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
                        fg.totals.net.gte(0) ? "text-yield" : "text-rose-400"
                      )}
                    >
                      {fg.totals.net.gte(0) ? "+" : ""}
                      {formatInvestorNumber(fg.totals.net.toNumber())}
                    </span>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Gross Yield</TableHead>
                      <TableHead className="text-right">Fee %</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                      <TableHead className="text-right">IB</TableHead>
                      <TableHead className="text-right">Net Yield</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Row 1: The Month-End reporting yield (if it exists) */}
                    {fg.monthEndEvent && (
                      <TableRow key={fg.monthEndEvent.id}>
                        <TableCell>
                          {format(new Date(fg.monthEndEvent.event_date), "MMM d")}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {(() => {
                            const eventDate = new Date(fg.monthEndEvent.event_date);
                            const monthStart = new Date(
                              eventDate.getFullYear(),
                              eventDate.getMonth(),
                              1
                            );
                            const monthEnd = new Date(
                              eventDate.getFullYear(),
                              eventDate.getMonth() + 1,
                              0
                            );
                            return `${format(monthStart, "MMM d")} - ${format(monthEnd, "MMM d")} (Month End)`;
                          })()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {fg.monthEndEvent.gross_yield_amount > 0
                            ? formatInvestorNumber(fg.monthEndEvent.gross_yield_amount)
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {fg.monthEndEvent.fee_pct > 0
                            ? `${fg.monthEndEvent.fee_pct.toFixed(2)}%`
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-rose-400">
                          {fg.monthEndEvent.fee_amount > 0
                            ? `-${formatInvestorNumber(fg.monthEndEvent.fee_amount)}`
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {fg.monthEndEvent.ib_amount > 0
                            ? `-${formatInvestorNumber(fg.monthEndEvent.ib_amount)}`
                            : "--"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono font-semibold",
                            fg.monthEndEvent.net_yield_amount >= 0 ? "text-yield" : "text-rose-400"
                          )}
                        >
                          {fg.monthEndEvent.net_yield_amount >= 0 ? "+" : ""}
                          {formatInvestorNumber(fg.monthEndEvent.net_yield_amount)}
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Row 2: The Aggregated Transaction yields (if any exist) */}
                    {fg.transactionEvents.length > 0 &&
                      (() => {
                        const aggGrossDec = fg.transactionEvents.reduce(
                          (sum: Decimal, e: InvestorYieldEvent) =>
                            sum.plus(parseFinancial(e.gross_yield_amount)),
                          new Decimal(0)
                        );
                        const aggFeeDec = fg.transactionEvents.reduce(
                          (sum: Decimal, e: InvestorYieldEvent) =>
                            sum.plus(parseFinancial(e.fee_amount)),
                          new Decimal(0)
                        );
                        const aggIbDec = fg.transactionEvents.reduce(
                          (sum: Decimal, e: InvestorYieldEvent) =>
                            sum.plus(parseFinancial(e.ib_amount)),
                          new Decimal(0)
                        );
                        const aggNetDec = fg.transactionEvents.reduce(
                          (sum: Decimal, e: InvestorYieldEvent) =>
                            sum.plus(parseFinancial(e.net_yield_amount)),
                          new Decimal(0)
                        );
                        const aggGross = aggGrossDec.toNumber();
                        const aggFee = aggFeeDec.toNumber();
                        const aggIb = aggIbDec.toNumber();
                        const aggNet = aggNetDec.toNumber();
                        const lastDate = fg.transactionEvents
                          .map((e) => new Date(e.event_date))
                          .sort((a, b) => b.getTime() - a.getTime())[0];

                        return (
                          <TableRow key={`agg-${fg.fund.id}`}>
                            <TableCell>{format(lastDate, "MMM d")}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              Mid-Month Transaction Yields (Aggregated)
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {aggGross > 0 ? formatInvestorNumber(aggGross) : "--"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              --
                            </TableCell>
                            <TableCell className="text-right font-mono text-rose-400">
                              {aggFee > 0 ? `-${formatInvestorNumber(aggFee)}` : "--"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {aggIb > 0 ? `-${formatInvestorNumber(aggIb)}` : "--"}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-mono font-semibold",
                                aggNet >= 0 ? "text-yield" : "text-rose-400"
                              )}
                            >
                              {aggNet >= 0 ? "+" : ""}
                              {formatInvestorNumber(aggNet)}
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs">
                  <span className="text-muted-foreground">Total</span>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-muted-foreground">
                      Gross: {formatInvestorNumber(fg.totals.gross.toNumber())}
                    </span>
                    {fg.totals.fees.gt(0) && (
                      <span className="text-rose-400">
                        Fees: -{formatInvestorNumber(fg.totals.fees.toNumber())}
                      </span>
                    )}
                    {fg.totals.ib?.gt(0) && (
                      <span className="text-muted-foreground">
                        IB: -{formatInvestorNumber(fg.totals.ib.toNumber())}
                      </span>
                    )}
                    <span
                      className={cn(
                        "font-semibold",
                        fg.totals.net.gte(0) ? "text-yield" : "text-rose-400"
                      )}
                    >
                      Net: {fg.totals.net.gte(0) ? "+" : ""}
                      {formatInvestorNumber(fg.totals.net.toNumber())}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
