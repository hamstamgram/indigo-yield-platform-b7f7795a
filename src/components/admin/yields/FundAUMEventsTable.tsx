/**
 * FundAUMEventsTable Component
 * Displays the audit trail of AUM checkpoints from fund_aum_events
 * Uses OptimizedTable with virtual scrolling for performance
 */

import React, { useMemo, memo } from "react";
import { Badge, Skeleton } from "@/components/ui";
import { OptimizedTable, Column } from "@/components/ui/optimized-table";
import { useFundAUMEvents, type FundAUMEvent } from "@/hooks/data/admin/useFundAUMEvents";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FundAUMEventsTableProps {
  fundId: string | null;
  dateRange?: { from: string; to: string };
  includeVoided?: boolean;
  formatValue: (value: number, asset: string) => string;
  asset: string;
}

const TRIGGER_TYPE_COLORS: Record<string, string> = {
  deposit: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  withdrawal: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  month_end: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  manual: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
};

const getTriggerColor = (triggerType: string) => {
  return TRIGGER_TYPE_COLORS[triggerType] || "bg-muted text-muted-foreground";
};

export const FundAUMEventsTable = memo(function FundAUMEventsTable({
  fundId,
  dateRange,
  includeVoided = false,
  formatValue,
  asset,
}: FundAUMEventsTableProps) {
  const { data: events = [], isLoading } = useFundAUMEvents({
    fundId,
    dateRange,
    includeVoided,
  });

  // Memoize columns to prevent recreation on each render
  const columns = useMemo<Column<FundAUMEvent>[]>(() => [
    {
      header: "Date/Time",
      accessor: (event) => format(new Date(event.event_ts), "MMM d, yyyy HH:mm"),
      width: "150px",
      className: "font-mono text-sm",
    },
    {
      header: "Trigger",
      accessor: "trigger_type",
      width: "100px",
      cell: (value) => (
        <Badge variant="outline" className={cn("text-xs", getTriggerColor(value as string))}>
          {value}
        </Badge>
      ),
    },
    {
      header: "Opening AUM",
      accessor: (event) => formatValue(event.opening_aum, asset),
      className: "text-right font-mono",
    },
    {
      header: "Pre-Flow AUM",
      accessor: (event) => formatValue(event.closing_aum, asset),
      className: "text-right font-mono",
    },
    {
      header: "Post-Flow AUM",
      accessor: (event) => event.post_flow_aum != null ? formatValue(event.post_flow_aum, asset) : "—",
      className: "text-right font-mono",
    },
    {
      header: "Purpose",
      accessor: "purpose",
      width: "100px",
      cell: (value) => (
        <Badge variant="outline" className="text-xs">
          {value}
        </Badge>
      ),
    },
    {
      header: "Reference",
      accessor: (event) => event.trigger_reference || "—",
      className: "text-xs text-muted-foreground truncate max-w-[200px]",
    },
  ], [formatValue, asset]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <OptimizedTable
        columns={columns}
        data={events}
        getRowKey={(event) => event.id}
        enableVirtualScroll={events.length > 30}
        rowHeight={48}
        emptyState={
          <div className="text-center py-8 text-muted-foreground">
            No AUM events recorded for this fund.
          </div>
        }
      />
    </div>
  );
});

export default FundAUMEventsTable;
