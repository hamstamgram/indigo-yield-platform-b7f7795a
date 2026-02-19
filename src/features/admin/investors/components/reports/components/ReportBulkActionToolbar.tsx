/**
 * Report Bulk Action Toolbar
 * Sticky bar above reports table when rows are selected
 */

import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Trash2, X } from "lucide-react";
import type { ReportSelectionSummary } from "../hooks/useReportSelection";

interface ReportBulkActionToolbarProps {
  summary: ReportSelectionSummary;
  isSuperAdmin: boolean;
  onDelete: () => void;
  onClear: () => void;
}

export function ReportBulkActionToolbar({
  summary,
  isSuperAdmin,
  onDelete,
  onClear,
}: ReportBulkActionToolbarProps) {
  if (summary.count === 0) return null;

  const periodLabel =
    summary.periods.length <= 3 ? summary.periods.join(", ") : `${summary.periods.length} periods`;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-lg border bg-background/95 backdrop-blur px-4 py-2 shadow-sm">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">{summary.count} selected</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">
          {summary.investorCount} investor{summary.investorCount !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">{periodLabel}</span>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="destructive" size="sm" onClick={onDelete} disabled={!isSuperAdmin}>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Selected
                </Button>
              </span>
            </TooltipTrigger>
            {!isSuperAdmin && (
              <TooltipContent>Super admin access required for bulk operations</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
