/**
 * YieldEventsTable - Display all investor yield events with visibility status
 * Shows crystallization events from deposits, withdrawals, and month-end
 */

import { useState, useMemo } from "react";
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
} from "@/components/ui";
import { Search, Download, Eye, Clock, TrendingUp, Users, Filter } from "lucide-react";
import { format } from "date-fns";
import { useFundYieldEvents } from "@/features/admin/yields/hooks/useYieldCrystallization";
import { useActiveFundsWithAUM, useSortableColumns } from "@/hooks";
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
    if (visibilityFilter !== "all") {
      filtered = filtered.filter((e) => e.visibility_scope === visibilityFilter);
    }

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
    const pending = filteredEvents.filter((e) => e.visibility_scope === "admin_only").length;
    const visible = filteredEvents.filter((e) => e.visibility_scope === "investor_visible").length;
    const totalYield = filteredEvents.reduce((sum, e) => sum + e.net_yield_amount, 0);
    return { pending, visible, total: filteredEvents.length, totalYield };
  }, [filteredEvents]);

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case "deposit":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Deposit
          </Badge>
        );
      case "withdrawal":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Withdrawal
          </Badge>
        );
      case "month_end":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Month End
          </Badge>
        );
      case "manual":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
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
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
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
            Yield Crystallization Events
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-amber-700 bg-amber-100">
              {stats.pending} Pending
            </Badge>
            <Badge variant="secondary" className="text-emerald-700 bg-emerald-100">
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
                  {fund.name} ({fund.code})
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

          <Button variant="outline" size="icon" title="Export CSV">
            <Download className="h-4 w-4" />
          </Button>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    column="event_date"
                    currentSort={sortConfig}
                    onSort={requestSort}
                  >
                    Date
                  </SortableTableHead>
                  <TableHead>Trigger</TableHead>
                  <SortableTableHead
                    column="investor_balance"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right"
                  >
                    Balance
                  </SortableTableHead>
                  <SortableTableHead
                    column="investor_share_pct"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right"
                  >
                    Share %
                  </SortableTableHead>
                  <TableHead className="text-right">Yield %</TableHead>
                  <SortableTableHead
                    column="gross_yield_amount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right"
                  >
                    Gross
                  </SortableTableHead>
                  <SortableTableHead
                    column="fee_amount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right"
                  >
                    Fees
                  </SortableTableHead>
                  <SortableTableHead
                    column="net_yield_amount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right"
                  >
                    Net
                  </SortableTableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.slice(0, 100).map((event) => (
                  <TableRow
                    key={event.id}
                    className={cn(event.visibility_scope === "admin_only" && "bg-amber-50/50")}
                  >
                    <TableCell className="font-mono text-sm">
                      {format(new Date(event.event_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{getTriggerBadge(event.trigger_type)}</TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={event.investor_balance} type="number" />
                    </TableCell>
                    <TableCell className="text-right">
                      <PercentageValue value={event.investor_share_pct * 100} decimals={4} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PercentageValue value={event.fund_yield_pct * 100} decimals={4} />
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={event.gross_yield_amount} type="number" />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <FormattedNumber value={-event.fee_amount} type="number" />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <FormattedNumber value={event.net_yield_amount} type="number" colorize />
                    </TableCell>
                    <TableCell>{getVisibilityBadge(event.visibility_scope)}</TableCell>
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
