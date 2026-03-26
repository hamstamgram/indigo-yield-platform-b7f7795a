/**
 * Bulk Delete Withdrawals Dialog
 * Confirmation dialog for bulk-deleting (cancelling) withdrawals
 * Requires typing DELETE to confirm
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
  Textarea,
  Alert,
  AlertDescription,
  Checkbox,
} from "@/components/ui";
import { AlertTriangle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { formatAssetValue } from "@/utils/formatters";
import { toNum } from "@/utils/numeric";
import type { Withdrawal } from "@/types/domains";
import type { WithdrawalSelectionSummary } from "../hooks/useWithdrawalSelection";

interface BulkDeleteWithdrawalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawals: Withdrawal[];
  summary: WithdrawalSelectionSummary;
  isPending: boolean;
  onConfirm: (reason: string, hardDelete: boolean) => void;
}

function formatAmountBreakdown(amountsByAsset: Record<string, string>): string {
  return Object.entries(amountsByAsset)
    .map(([asset, amount]) => `${formatAssetValue(toNum(amount), asset)} ${asset}`)
    .join(" + ");
}

export function BulkDeleteWithdrawalsDialog({
  open,
  onOpenChange,
  withdrawals,
  summary,
  isPending,
  onConfirm,
}: BulkDeleteWithdrawalsDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [hardDelete, setHardDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleClose = () => {
    setReason("");
    setConfirmText("");
    setHardDelete(false);
    setDetailsOpen(false);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (confirmText !== "DELETE" || reason.trim().length < 3) return;
    onConfirm(reason.trim(), hardDelete);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {summary.count} Withdrawal{summary.count !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            This will {hardDelete ? "permanently delete" : "cancel"} all selected withdrawal
            requests. This action is logged for audit purposes.
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
            <Label htmlFor="bulk-delete-withdrawal-reason">Reason for deletion *</Label>
            <Textarea
              id="bulk-delete-withdrawal-reason"
              placeholder="Explain why these withdrawals are being deleted..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 3 characters. Applied to all withdrawals in this batch.
            </p>
          </div>

          {/* Hard delete toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="bulk-hard-delete"
              checked={hardDelete}
              onCheckedChange={(checked) => setHardDelete(checked === true)}
            />
            <Label htmlFor="bulk-hard-delete" className="text-sm font-normal">
              Permanently delete (cannot be recovered)
            </Label>
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="bulk-delete-withdrawal-confirm">Type DELETE to confirm</Label>
            <Input
              id="bulk-delete-withdrawal-confirm"
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
            disabled={isPending || confirmText !== "DELETE" || reason.trim().length < 3}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
