/**
 * Bulk Delete Reports Dialog
 * Confirmation dialog requiring typed DELETE for bulk report deletion
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { AlertTriangle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import type { HistoricalReport, ReportSelectionSummary } from "../hooks/useReportSelection";

interface BulkDeleteReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: HistoricalReport[];
  summary: ReportSelectionSummary;
  isPending: boolean;
  onConfirm: () => void;
}

export function BulkDeleteReportsDialog({
  open,
  onOpenChange,
  reports,
  summary,
  isPending,
  onConfirm,
}: BulkDeleteReportsDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleClose = () => {
    setConfirmText("");
    setDetailsOpen(false);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (confirmText !== "DELETE") return;
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {summary.count} Report{summary.count !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            This will permanently delete the selected generated statements. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <Alert>
            <AlertDescription className="space-y-1">
              <div>
                <strong>Count:</strong> {summary.count} report{summary.count !== 1 ? "s" : ""}
              </div>
              <div>
                <strong>Investors:</strong> {summary.investorCount}
              </div>
              <div>
                <strong>Periods:</strong>{" "}
                {summary.periods.length <= 5
                  ? summary.periods.join(", ")
                  : `${summary.periods.length} periods`}
              </div>
            </AlertDescription>
          </Alert>

          {/* Expandable details */}
          <div className="border rounded-md">
            <button
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              {detailsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              View report details
            </button>
            {detailsOpen && (
              <div className="border-t max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium">Period</th>
                      <th className="text-left px-3 py-1.5 font-medium">Investor</th>
                      <th className="text-left px-3 py-1.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-1 font-mono">{r.period_month}</td>
                        <td className="px-3 py-1 max-w-[160px] truncate">{r.investor_name}</td>
                        <td className="px-3 py-1">{r.delivery_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="bulk-delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="bulk-delete-confirm"
              placeholder="Type DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || confirmText !== "DELETE"}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
