/**
 * FundAUMEventsTable Component
 * Displays the audit trail of AUM checkpoints from fund_aum_events
 */

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Skeleton,
} from "@/components/ui";
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

export function FundAUMEventsTable({
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No AUM events recorded for this fund.
      </div>
    );
  }

  const getTriggerColor = (triggerType: string) => {
    return TRIGGER_TYPE_COLORS[triggerType] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Date/Time</TableHead>
            <TableHead className="w-[100px]">Trigger</TableHead>
            <TableHead className="text-right">Opening AUM</TableHead>
            <TableHead className="text-right">Pre-Flow AUM</TableHead>
            <TableHead className="text-right">Post-Flow AUM</TableHead>
            <TableHead className="w-[100px]">Purpose</TableHead>
            <TableHead className="min-w-[150px]">Reference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event: FundAUMEvent) => (
            <TableRow
              key={event.id}
              className={cn(event.is_voided && "opacity-50 line-through")}
            >
              <TableCell className="font-mono text-sm">
                {format(new Date(event.event_ts), "MMM d, yyyy HH:mm")}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("text-xs", getTriggerColor(event.trigger_type))}>
                  {event.trigger_type}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatValue(event.opening_aum, asset)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatValue(event.closing_aum, asset)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {event.post_flow_aum != null ? formatValue(event.post_flow_aum, asset) : "—"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {event.purpose}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]" title={event.trigger_reference || undefined}>
                {event.trigger_reference || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default FundAUMEventsTable;
