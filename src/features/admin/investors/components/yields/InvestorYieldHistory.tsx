/**
 * InvestorYieldHistory - Shows crystallization event history for a specific investor
 * Displays all yield events including pending (admin_only) and visible ones
 */

import { useState, useMemo } from "react";
import { parseFinancial } from "@/utils/financial";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui";
import { ChevronDown, Clock, Eye, TrendingUp, Wallet, Ban } from "lucide-react";
import { format } from "date-fns";
import { useInvestorYieldEventsAdmin } from "@/features/admin/yields/hooks/useYieldCrystallization";
import { useActiveFundsWithAUM } from "@/hooks";
import { cn } from "@/lib/utils";
import type { YieldEvent } from "@/types/domains/yieldCrystallization";

interface InvestorYieldHistoryProps {
  investorId: string;
  className?: string;
}

export function InvestorYieldHistory({ investorId, className }: InvestorYieldHistoryProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedFundId, setSelectedFundId] = useState<string>("all");

  // Fetch funds for filter dropdown
  const { data: funds = [] } = useActiveFundsWithAUM();

  // Fetch yield events for this investor
  const { data: yieldEvents = [], isLoading } = useInvestorYieldEventsAdmin(investorId, {
    fundId: selectedFundId === "all" ? undefined : selectedFundId,
    visibilityScope: "all", // Admin sees both pending and visible
    includeVoided: true, // Bug #10: Admin sees voided entries with visual distinction
  });

  // Calculate summary stats (exclude voided from totals)
  const stats = useMemo(() => {
    const active = yieldEvents.filter((e) => !e.is_voided);
    const pending = active.filter((e) => e.visibility_scope === "admin_only");
    const visible = active.filter((e) => e.visibility_scope === "investor_visible");
    const voidedCount = yieldEvents.filter((e) => e.is_voided).length;
    const totalGross = active.reduce((sum, e) => parseFinancial(sum).plus(parseFinancial(e.gross_yield_amount)).toNumber(), 0);
    const totalFees = active.reduce((sum, e) => parseFinancial(sum).plus(parseFinancial(e.fee_amount)).toNumber(), 0);
    const totalNet = active.reduce((sum, e) => parseFinancial(sum).plus(parseFinancial(e.net_yield_amount)).toNumber(), 0);

    return {
      pendingCount: pending.length,
      visibleCount: visible.length,
      voidedCount,
      pendingYield: pending.reduce((sum, e) => parseFinancial(sum).plus(parseFinancial(e.net_yield_amount)).toNumber(), 0),
      totalGross,
      totalFees,
      totalNet,
    };
  }, [yieldEvents]);

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case "deposit":
        return "Deposit";
      case "withdrawal":
        return "Withdrawal";
      case "month_end":
        return "Month End";
      case "manual":
        return "Manual";
      default:
        return trigger;
    }
  };

  const getTriggerBadge = (trigger: string) => {
    const colors: Record<string, string> = {
      deposit: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      withdrawal: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      month_end: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      manual: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };
    return (
      <Badge variant="outline" className={colors[trigger] || ""}>
        {getTriggerLabel(trigger)}
      </Badge>
    );
  };

  const formatNumber = (value: number, decimals: number = 6) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(4)}%`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Yield Crystallization History
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                />
              </CardTitle>
              <div className="flex items-center gap-2">
                {stats.pendingCount > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-400 border-amber-500/20"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {stats.pendingCount} Pending
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {stats.visibleCount} Visible
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Gross Yield</p>
                <p className="text-lg font-mono font-semibold">{formatNumber(stats.totalGross)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Fees</p>
                <p className="text-lg font-mono font-semibold text-muted-foreground">
                  -{formatNumber(stats.totalFees)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Net Yield</p>
                <p
                  className={cn(
                    "text-lg font-mono font-semibold",
                    stats.totalNet >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {formatNumber(stats.totalNet)}
                </p>
              </div>
              {stats.pendingCount > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Pending Yield</p>
                  <p className="text-lg font-mono font-semibold text-amber-600">
                    {formatNumber(stats.pendingYield)}
                  </p>
                </div>
              )}
            </div>

            {/* Fund Filter */}
            {funds.length > 1 && (
              <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Funds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Funds</SelectItem>
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
            )}

            {/* Events Table */}
            {yieldEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No yield events recorded</p>
                <p className="text-sm">
                  Events will appear after deposits, withdrawals, or month-end processing
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Trigger</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Balance</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Yield%</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Gross</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Fees</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Net</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yieldEvents.map((event) => (
                      <TableRow
                        key={event.id}
                        className={cn(
                          event.is_voided && "opacity-60",
                          !event.is_voided &&
                            event.visibility_scope === "admin_only" &&
                            "bg-amber-500/10"
                        )}
                      >
                        <TableCell className="font-mono whitespace-nowrap py-1.5">
                          {format(new Date(event.event_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {getTriggerBadge(event.trigger_type)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono tabular-nums py-1.5",
                            event.is_voided && "line-through"
                          )}
                        >
                          {formatNumber(parseFloat(String(event.investor_balance)), 4)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono tabular-nums py-1.5",
                            event.is_voided && "line-through"
                          )}
                        >
                          {formatPercent(parseFloat(String(event.fund_yield_pct)))}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono tabular-nums py-1.5",
                            event.is_voided && "line-through"
                          )}
                        >
                          {formatNumber(parseFloat(String(event.gross_yield_amount)))}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono tabular-nums text-muted-foreground py-1.5",
                            event.is_voided && "line-through"
                          )}
                        >
                          -{formatNumber(parseFloat(String(event.fee_amount)))}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono tabular-nums font-medium py-1.5",
                            event.is_voided
                              ? "line-through text-muted-foreground"
                              : parseFloat(String(event.net_yield_amount)) >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                          )}
                        >
                          {formatNumber(parseFloat(String(event.net_yield_amount)))}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {event.is_voided ? (
                            <Badge
                              variant="outline"
                              className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs"
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Voided
                            </Badge>
                          ) : event.visibility_scope === "admin_only" ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-400 border-amber-500/20"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Visible
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
