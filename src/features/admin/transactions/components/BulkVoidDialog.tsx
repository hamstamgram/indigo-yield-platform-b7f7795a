/**
 * Bulk Void Dialog
 * Confirmation dialog for voiding multiple transactions at once
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
} from "@/components/ui";
import { AlertTriangle, Loader2, Info, ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatAssetValue } from "@/utils/formatters";
import { parseFinancial } from "@/utils/financial";
import type { TransactionViewModel } from "@/types/domains/transaction";
import type { SelectionSummary } from "../hooks/useTransactionSelection";

interface BulkVoidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: TransactionViewModel[];
  summary: SelectionSummary;
  isPending: boolean;
  onConfirm: (reason: string) => void;
}

function formatAmountBreakdown(amountsByAsset: Record<string, string>): string {
  return Object.entries(amountsByAsset)
    .map(
      ([asset, amount]) => `${formatAssetValue(parseFinancial(amount).toNumber(), asset)} ${asset}`
    )
    .join(" + ");
}

export function BulkVoidDialog({
  open,
  onOpenChange,
  transactions,
  summary,
  isPending,
  onConfirm,
}: BulkVoidDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleClose = () => {
    setReason("");
    setConfirmText("");
    setDetailsOpen(false);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (confirmText !== "VOID" || reason.trim().length < 3) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Void {summary.count} Transaction{summary.count !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            This will void all selected transactions atomically. Positions and AUM will be
            recalculated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <Alert>
            <AlertDescription className="space-y-1">
              <div>
                <strong>Count:</strong> {summary.count} transaction{summary.count !== 1 ? "s" : ""}
              </div>
              <div>
                <strong>Total:</strong> {formatAmountBreakdown(summary.amountsByAsset)}
              </div>
              <div>
                <strong>Investors:</strong> {summary.investorCount}
              </div>
            </AlertDescription>
          </Alert>

          {/* System-generated warning */}
          {summary.hasSystemGenerated && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <div className="flex-1">
                  <AlertDescription className="font-medium text-amber-700">
                    Selection includes system-generated transactions
                  </AlertDescription>
                  <p className="text-xs text-amber-600/80 mt-1">
                    Some selected transactions were created by yield distributions, fee
                    calculations, or IB allocations. Voiding may affect related records.
                  </p>
                </div>
              </div>
            </Alert>
          )}

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
              View transaction details
            </button>
            {detailsOpen && (
              <div className="border-t max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium">Date</th>
                      <th className="text-left px-3 py-1.5 font-medium">Investor</th>
                      <th className="text-left px-3 py-1.5 font-medium">Type</th>
                      <th className="text-right px-3 py-1.5 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-t">
                        <td className="px-3 py-1">{format(parseISO(tx.txDate), "MMM d, yyyy")}</td>
                        <td className="px-3 py-1 max-w-[120px] truncate">{tx.investorName}</td>
                        <td className="px-3 py-1">{tx.displayType}</td>
                        <td className="px-3 py-1 text-right font-mono">
                          {formatAssetValue(parseFinancial(tx.amount).toNumber(), tx.asset)}{" "}
                          {tx.asset}
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
            <Label htmlFor="bulk-void-reason">Reason for voiding *</Label>
            <Textarea
              id="bulk-void-reason"
              placeholder="Explain why these transactions are being voided..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 3 characters. Applied to all transactions in this batch.
            </p>
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="bulk-void-confirm">Type VOID to confirm</Label>
            <Input
              id="bulk-void-confirm"
              placeholder="Type VOID"
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
            disabled={isPending || confirmText !== "VOID" || reason.trim().length < 3}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Void All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
