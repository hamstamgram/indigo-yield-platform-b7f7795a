/**
 * YieldEventsTable - Display all investor yield events with visibility status
 * Shows yield events derived from deposits, withdrawals, and month-end
 */

import { useState, useMemo } from "react";
import { parseFinancial } from "@/utils/financial";
import { toNum } from "@/utils/numeric";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Button,
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
  SortableTableHead,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Search, Download, Eye, Clock, TrendingUp, Users, Filter } from "lucide-react";
import { format } from "date-fns";
import { useFundYieldEvents } from "@/features/admin/yields/hooks/useYieldCrystallization";
import { useActiveFundsWithAUM } from "@/features/admin/yields/hooks/useYieldOperations";
import { useSortableColumns } from "@/hooks";
import { cn } from "@/lib/utils";
import type { YieldEvent } from "@/types/domains/yieldCrystallization";
import { FormattedNumber, PercentageValue } from "@/components/common/FormattedNumber";

interface YieldEventsTableProps {
  initialFundId?: string;
  className?: string;
}

export function YieldEventsTable({ initialFundId, className }: YieldEventsTableProps) {
  const [selectedFundId, setSelectedFundId] = useState<string>(initialFundId || "all");
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | "admin_only" | "investor_visible"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch funds for selector
  const { data: funds = [], isLoading: fundsLoading } = useActiveFundsWithAUM();

  // Fetch yield events for selected fund
  const { data: yieldEvents = [], isLoading: eventsLoading } = useFundYieldEvents(
    selectedFundId === "all" ? null : selectedFundId,
    { visibilityScope: visibilityFilter === "all" ? undefined : visibilityFilter }
  );

  // Filter events based on search and visibility
  const filteredEvents = useMemo(() => {
    let filtered = yieldEvents;

    // Apply visibility filter if not already done by hook
    // Visibility filtering removed -- V6 has no visibility_scope

    // Apply search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter((e) => e.investor_id.toLowerCase().includes(search));
    }

    return filtered;
  }, [yieldEvents, visibilityFilter, searchQuery]);

  const { sortedData, sortConfig, requestSort } = useSortableColumns(filteredEvents, {
    column: "event_date",
    direction: "desc",
  });

  // Calculate summary stats
  const stats = useMemo(() => {
    const pending = 0;
    const visible = filteredEvents.length;
    const totalYield = filteredEvents
      .reduce((sum, e) => sum.plus(parseFinancial(e.net_yield_amount || 0)), parseFinancial(0))
      .toNumber();
    return { pending, visible, total: filteredEvents.length, totalYield };
  }, [filteredEvents]);

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case "deposit":
        return (
          <Badge variant="outline" className="bg-yield/10 text-yield border-yield/20">
            Deposit
          </Badge>
        );
      case "withdrawal":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
            Withdrawal
          </Badge>
        );
      case "month_end":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            Month End
          </Badge>
        );
      case "manual":
        return (
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-400 border-purple-500/20"
          >
            Manual
          </Badge>
        );
      default:
        return <Badge variant="outline">{trigger}</Badge>;
    }
  };

  const getVisibilityBadge = (scope: string) => {
    if (scope === "admin_only") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yield/10 text-yield border-yield/20">
        <Eye className="h-3 w-3 mr-1" />
        Visible
      </Badge>
    );
  };

  const isLoading = fundsLoading || eventsLoading;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Yield Events
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-amber-400 bg-amber-500/10">
              {stats.pending} Pending
            </Badge>
            <Badge variant="secondary" className="text-yield bg-yield/10">
              {stats.visible} Visible
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedFundId} onValueChange={setSelectedFundId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select fund" />
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

          <Select
            value={visibilityFilter}
            onValueChange={(v) => setVisibilityFilter(v as typeof visibilityFilter)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="admin_only">Pending Only</SelectItem>
              <SelectItem value="investor_visible">Visible Only</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by investor ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
        </div>

        {/* Table */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No yield events found</p>
            <p className="text-sm">
              Events will appear after deposits, withdrawals, or month-end processing
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    column="event_date"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="whitespace-nowrap"
                  >
                    Date
                  </SortableTableHead>
                  <TableHead className="whitespace-nowrap">Trigger</TableHead>
                  <SortableTableHead
                    column="investor_balance"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right whitespace-nowrap"
                  >
                    Balance
                  </SortableTableHead>
                  <SortableTableHead
                    column="investor_share_pct"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right whitespace-nowrap"
                  >
                    Share%
                  </SortableTableHead>
                  <TableHead className="text-right whitespace-nowrap">Yield%</TableHead>
                  <SortableTableHead
                    column="gross_yield_amount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right whitespace-nowrap"
                  >
                    Gross
                  </SortableTableHead>
                  <SortableTableHead
                    column="fee_amount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right whitespace-nowrap"
                  >
                    Fees
                  </SortableTableHead>
                  <SortableTableHead
                    column="net_yield_amount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right whitespace-nowrap"
                  >
                    Net
                  </SortableTableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.slice(0, 100).map((event) => (
                  <TableRow key={event.id} className={cn()}>
                    <TableCell className="font-mono whitespace-nowrap py-1.5">
                      {format(new Date(event.event_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="py-1.5">{getTriggerBadge(event.trigger_type)}</TableCell>
                    <TableCell className="text-right tabular-nums py-1.5">
                      <FormattedNumber value={event.investor_balance} type="number" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums py-1.5">
                      <PercentageValue value={event.investor_share_pct} decimals={4} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums py-1.5">
                      <PercentageValue value={event.fund_yield_pct} decimals={4} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums py-1.5">
                      <FormattedNumber value={event.gross_yield_amount} type="number" />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums py-1.5">
                      <FormattedNumber
                        value={-toNum(event.fee_amount)}
                        type="number"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums py-1.5">
                      <FormattedNumber value={event.net_yield_amount} type="number" colorize />
                    </TableCell>
                    <TableCell className="py-1.5">
                      {getVisibilityBadge("investor_visible")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Footer */}
        {sortedData.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
            <span>
              Showing {Math.min(sortedData.length, 100)} of {sortedData.length} events
            </span>
            <span>
              Total Net Yield: <FormattedNumber value={stats.totalYield} type="number" />
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
