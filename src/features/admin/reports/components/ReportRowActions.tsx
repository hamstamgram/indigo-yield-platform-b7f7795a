/**
 * Report Row Actions
 * Per-row dropdown menu consolidating Preview, Send, Regenerate, Delete actions.
 * Replaces the 5 unlabeled icon buttons.
 */

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { MoreHorizontal, Eye, Send, RefreshCw, Trash2, Loader2 } from "lucide-react";
import type { InvestorReportSummary } from "@/features/admin/reports/services/reportQueryService";

interface ReportRowActionsProps {
  report: InvestorReportSummary;
  isSuperAdmin: boolean;
  sendingId: string | null;
  regeneratingId: string | null;
  deletingId: string | null;
  onPreview: (report: InvestorReportSummary) => void;
  onSend: (report: InvestorReportSummary) => void;
  onRegenerate: (report: InvestorReportSummary) => void;
  onDelete: (report: InvestorReportSummary) => void;
}

export function ReportRowActions({
  report,
  isSuperAdmin,
  sendingId,
  regeneratingId,
  deletingId,
  onPreview,
  onSend,
  onRegenerate,
  onDelete,
}: ReportRowActionsProps) {
  const isProcessing =
    sendingId === report.investor_id ||
    regeneratingId === report.investor_id ||
    deletingId === report.investor_id;

  const hasReport = report.statement_id || report.has_reports;
  const canSend = report.delivery_status === "generated" || report.delivery_status === "failed";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isProcessing}>
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onPreview(report)} disabled={!hasReport}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </DropdownMenuItem>

        {canSend && (
          <DropdownMenuItem onClick={() => onSend(report)}>
            <Send className="h-4 w-4 mr-2" />
            Send Email
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onRegenerate(report)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onDelete(report)}
          disabled={!hasReport || !isSuperAdmin}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
          {!isSuperAdmin && (
            <span className="ml-auto text-xs text-muted-foreground">Super Admin</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
