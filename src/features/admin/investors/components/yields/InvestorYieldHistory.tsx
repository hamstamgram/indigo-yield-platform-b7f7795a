/**
 * InvestorYieldHistory - Shows yield event history for a specific investor
 * Displays all yield events including pending (admin_only) and visible ones
 */

import { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { parseFinancial } from "@/utils/financial";
import { CryptoIcon } from "@/components/CryptoIcons";
import { FinancialValue } from "@/components/common/FinancialValue";
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
import { useActiveFundsWithAUM } from "@/features/admin/yields/hooks/useYieldOperations";
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
    const pending: typeof active = [];
    const visible = active;
    const voidedCount = yieldEvents.filter((e) => e.is_voided).length;
    const totalGross = active
      .reduce((sum, e) => sum.plus(parseFinancial(e.gross_yield_amount)), new Decimal(0))
      .toString();
    const totalFees = active
      .reduce((sum, e) => sum.plus(parseFinancial(e.fee_amount)), new Decimal(0))
      .toString();
    const totalNet = active
      .reduce((sum, e) => sum.plus(parseFinancial(e.net_yield_amount)), new Decimal(0))
      .toString();

    return {
      pendingCount: pending.length,
      visibleCount: visible.length,
      voidedCount,
      pendingYield: pending
        .reduce((sum, e) => sum.plus(parseFinancial(e.net_yield_amount)), new Decimal(0))
        .toString(),
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
      deposit: "bg-yield/10 text-yield border-yield/20",
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

  const formatPercent = (value: number | string) => {
    const pct = new Decimal(value).times(100).toFixed(4);
    return `${pct}%`;
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
                Yield Event History
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
                <Badge variant="outline" className="bg-yield/10 text-yield border-yield/20">
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
                <p className="text-lg font-semibold"><FinancialValue value={stats.totalGross} showAsset={false} /></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Fees</p>
                <p className="text-lg font-semibold text-muted-foreground">
                  <FinancialValue value={stats.totalFees} showAsset={false} prefix="-" />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Net Yield</p>
                <p className="text-lg font-semibold">
                  <FinancialValue value={stats.totalNet} showAsset={false} colorize />
                </p>
              </div>
              {stats.pendingCount > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Pending Yield</p>
                  <p className="text-lg font-semibold text-amber-600">
                    <FinancialValue value={stats.pendingYield} showAsset={false} />
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
                      <TableRow key={event.id} className={cn(event.is_voided && "opacity-60")}>
                        <TableCell className="font-mono whitespace-nowrap py-1.5">
                          {format(new Date(event.event_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {getTriggerBadge(event.trigger_type)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums py-1.5",
                            event.is_voided && "line-through"
                          )}
                        >
                          <FinancialValue value={event.investor_balance} displayDecimals={4} showAsset={false} />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono tabular-nums py-1.5",
                            event.is_voided && "line-through"
                          )}
                        >
                          {formatPercent(event.fund_yield_pct)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums py-1.5",
                            event.is_voided && "line-through"
                          )}
                        >
                          <FinancialValue value={event.gross_yield_amount} showAsset={false} />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums text-muted-foreground py-1.5",
                            event.is_voided && "line-through"
                          )}
                        >
                          <FinancialValue value={event.fee_amount} showAsset={false} prefix="-" />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums font-medium py-1.5",
                            event.is_voided
                              ? "line-through text-muted-foreground"
                              : new Decimal(String(event.net_yield_amount || 0)).greaterThanOrEqualTo(0)
                                ? "text-yield"
                                : "text-rose-400"
                          )}
                        >
                          <FinancialValue value={event.net_yield_amount} showAsset={false} />
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
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-yield/10 text-yield border-yield/20"
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
