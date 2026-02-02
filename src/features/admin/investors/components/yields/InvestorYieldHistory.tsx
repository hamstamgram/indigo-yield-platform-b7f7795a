/**
 * InvestorYieldHistory - Shows crystallization event history for a specific investor
 * Displays all yield events including pending (admin_only) and visible ones
 */

import { useState, useMemo } from "react";
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
import { ChevronDown, Clock, Eye, TrendingUp, Wallet } from "lucide-react";
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
  });

  // Calculate summary stats
  const stats = useMemo(() => {
    const pending = yieldEvents.filter((e) => e.visibility_scope === "admin_only");
    const visible = yieldEvents.filter((e) => e.visibility_scope === "investor_visible");
    const totalGross = yieldEvents.reduce((sum, e) => sum + e.gross_yield_amount, 0);
    const totalFees = yieldEvents.reduce((sum, e) => sum + e.fee_amount, 0);
    const totalNet = yieldEvents.reduce((sum, e) => sum + e.net_yield_amount, 0);

    return {
      pendingCount: pending.length,
      visibleCount: visible.length,
      pendingYield: pending.reduce((sum, e) => sum + e.net_yield_amount, 0),
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
      deposit: "bg-emerald-50 text-emerald-700 border-emerald-200",
      withdrawal: "bg-amber-50 text-amber-700 border-amber-200",
      month_end: "bg-blue-50 text-blue-700 border-blue-200",
      manual: "bg-purple-50 text-purple-700 border-purple-200",
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
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <Clock className="h-3 w-3 mr-1" />
                    {stats.pendingCount} Pending
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200"
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
                    stats.totalNet >= 0 ? "text-emerald-600" : "text-red-600"
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
                      {fund.name}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Yield %</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Fees</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yieldEvents.map((event) => (
                      <TableRow
                        key={event.id}
                        className={cn(event.visibility_scope === "admin_only" && "bg-amber-50/50")}
                      >
                        <TableCell className="font-mono text-sm">
                          {format(new Date(event.event_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{getTriggerBadge(event.trigger_type)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(event.investor_balance, 4)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatPercent(event.fund_yield_pct)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(event.gross_yield_amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          -{formatNumber(event.fee_amount)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono font-medium",
                            event.net_yield_amount >= 0 ? "text-emerald-600" : "text-red-600"
                          )}
                        >
                          {formatNumber(event.net_yield_amount)}
                        </TableCell>
                        <TableCell>
                          {event.visibility_scope === "admin_only" ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200"
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
