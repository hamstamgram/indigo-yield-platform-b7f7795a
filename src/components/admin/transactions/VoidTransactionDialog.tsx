/**
 * Void Transaction Dialog
 * Allows admins to void a transaction with reason and confirmation
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useTransactionMutations } from "@/hooks/data/useTransactionMutations";

/**
 * Minimal transaction data required for the void dialog
 */
interface VoidableTransaction {
  id: string;
  type: string;
  amount: number;
  asset: string;
  investorName: string;
  txDate: string;
  isSystemGenerated?: boolean;
  // Optional fields for cache invalidation
  investorId?: string;
  fundId?: string | null;
}

interface VoidTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: VoidableTransaction | null;
  onSuccess: () => void;
}

export function VoidTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: VoidTransactionDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const { voidMutation } = useTransactionMutations();

  const handleVoid = async () => {
    if (!transaction) return;
    
    if (confirmText !== "VOID") {
      toast.error("Please type VOID to confirm");
      return;
    }

    if (reason.trim().length < 3) {
      toast.error("Void reason must be at least 3 characters");
      return;
    }

    voidMutation.mutate(
      {
        transactionId: transaction.id,
        reason: reason.trim(),
        investorId: transaction.investorId,
        fundId: transaction.fundId || undefined,
      },
      {
        onSuccess: () => {
          setReason("");
          setConfirmText("");
          onSuccess();
          onOpenChange(false);
        },
      }
    );
  };

  const handleClose = () => {
    setReason("");
    setConfirmText("");
    onOpenChange(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Void Transaction
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The transaction will be marked as voided
            and positions will be recalculated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction details */}
          <Alert>
            <AlertDescription className="space-y-1">
              <div><strong>Investor:</strong> {transaction.investorName}</div>
              <div><strong>Type:</strong> {transaction.type}</div>
              <div><strong>Amount:</strong> {transaction.amount.toFixed(8)} {transaction.asset}</div>
              <div><strong>Date:</strong> {transaction.txDate}</div>
            </AlertDescription>
          </Alert>

          {transaction.isSystemGenerated && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <div className="flex-1">
                  <AlertDescription className="font-medium text-amber-700">
                    System-generated transaction
                  </AlertDescription>
                  <p className="text-xs text-amber-600/80 mt-1">
                    This transaction was automatically created by yield distributions, fee calculations, 
                    or IB allocations. Voiding may affect related records.
                  </p>
                </div>
              </div>
            </Alert>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for voiding *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this transaction is being voided..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 3 characters required for audit trail
            </p>
            {reason.trim().length > 0 && reason.trim().length < 3 && (
              <p className="text-sm text-destructive">Reason must be at least 3 characters</p>
            )}
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirm">Type VOID to confirm</Label>
            <Input
              id="confirm"
              placeholder="Type VOID"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={voidMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleVoid}
            disabled={voidMutation.isPending || confirmText !== "VOID" || reason.trim().length < 3}
          >
            {voidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Void Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
