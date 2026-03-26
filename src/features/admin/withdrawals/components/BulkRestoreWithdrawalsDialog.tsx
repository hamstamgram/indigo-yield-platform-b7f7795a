/**
 * Bulk Restore Withdrawals Dialog
 * Confirmation dialog for restoring cancelled/rejected withdrawals back to pending
 * Lighter friction than void - no type-confirmation
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
  Label,
  Textarea,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { Undo2, Loader2, Info, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { formatAssetValue } from "@/utils/formatters";
import { toNum } from "@/utils/numeric";
import type { Withdrawal } from "@/types/domains";
import type { WithdrawalSelectionSummary } from "../hooks/useWithdrawalSelection";

interface BulkRestoreWithdrawalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawals: Withdrawal[];
  summary: WithdrawalSelectionSummary;
  isPending: boolean;
  onConfirm: (reason: string) => void;
}

function formatAmountBreakdown(amountsByAsset: Record<string, string>): string {
  return Object.entries(amountsByAsset)
    .map(([asset, amount]) => `${formatAssetValue(toNum(amount), asset)} ${asset}`)
    .join(" + ");
}

export function BulkRestoreWithdrawalsDialog({
  open,
  onOpenChange,
  withdrawals,
  summary,
  isPending,
  onConfirm,
}: BulkRestoreWithdrawalsDialogProps) {
  const [reason, setReason] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleClose = () => {
    setReason("");
    setDetailsOpen(false);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (reason.trim().length < 3) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Restore {summary.count} Withdrawal{summary.count !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            This will restore all selected voided/rejected withdrawals back to pending status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <Alert>
            <AlertDescription className="space-y-1">
              <div>
                <strong>Count:</strong> {summary.count} withdrawal
                {summary.count !== 1 ? "s" : ""}
              </div>
              <div>
                <strong>Total:</strong> {formatAmountBreakdown(summary.amountsByAsset)}
              </div>
              <div>
                <strong>Investors:</strong> {summary.investorCount}
              </div>
            </AlertDescription>
          </Alert>

          {/* Info */}
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <AlertDescription className="text-amber-700 text-sm">
                Restored withdrawals will return to pending status and will need to be re-approved
                through the normal workflow.
              </AlertDescription>
            </div>
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
              View withdrawal details
            </button>
            {detailsOpen && (
              <div className="border-t max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium">Date</th>
                      <th className="text-left px-3 py-1.5 font-medium">Investor</th>
                      <th className="text-left px-3 py-1.5 font-medium">Status</th>
                      <th className="text-right px-3 py-1.5 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="border-t">
                        <td className="px-3 py-1">
                          {format(new Date(w.request_date), "MMM d, yyyy")}
                        </td>
                        <td className="px-3 py-1 max-w-[120px] truncate">
                          {w.investor_name || "Unknown"}
                        </td>
                        <td className="px-3 py-1 capitalize">{w.status}</td>
                        <td className="px-3 py-1 text-right font-mono">
                          {formatAssetValue(
                            toNum(w.requested_amount),
                            w.fund_class || w.asset || "UNITS"
                          )}{" "}
                          {(w.fund_class || w.asset || "UNITS").toUpperCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="bulk-restore-withdrawal-reason">Reason for restoring *</Label>
            <Textarea
              id="bulk-restore-withdrawal-reason"
              placeholder="Explain why these withdrawals are being restored..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 3 characters. Applied to all withdrawals in this batch.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || reason.trim().length < 3}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restore All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
