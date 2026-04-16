/**
 * Single Unvoid (Restore) Transaction Dialog
 * For row-menu unvoid of a single voided transaction
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
import { Undo2, Loader2, Info } from "lucide-react";
import { FinancialValue } from "@/components/common/FinancialValue";
import type { TransactionViewModel } from "@/types/domains/transaction";

interface UnvoidTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionViewModel | null;
  isPending: boolean;
  onConfirm: (reason: string) => void;
}

export function UnvoidTransactionDialog({
  open,
  onOpenChange,
  transaction,
  isPending,
  onConfirm,
}: UnvoidTransactionDialogProps) {
  const [reason, setReason] = useState("");

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (reason.trim().length < 3) return;
    onConfirm(reason.trim());
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Restore Transaction
          </DialogTitle>
          <DialogDescription>
            This will restore the voided transaction and update the investor position.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction details */}
          <Alert>
            <AlertDescription className="space-y-1">
              <div>
                <strong>Investor:</strong> {transaction.investorName}
              </div>
              <div>
                <strong>Type:</strong> {transaction.displayType}
              </div>
              <div>
                <strong>Amount:</strong>{" "}
                <FinancialValue value={transaction.amount} asset={transaction.asset} showAsset />
              </div>
              <div>
                <strong>Date:</strong> {transaction.txDate}
              </div>
            </AlertDescription>
          </Alert>

          {/* Cascade warning */}
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <AlertDescription className="text-amber-700 text-sm">
                Only the transaction itself is restored. Cascade-voided yield distributions, fee
                allocations, and IB ledger entries are NOT automatically restored. AUM is
                recalculated, but you may need to re-apply yield distributions manually.
              </AlertDescription>
            </div>
          </Alert>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="unvoid-reason">Reason for restoring *</Label>
            <Textarea
              id="unvoid-reason"
              placeholder="Explain why this transaction is being restored..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 3 characters required for audit trail
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || reason.trim().length < 3}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
