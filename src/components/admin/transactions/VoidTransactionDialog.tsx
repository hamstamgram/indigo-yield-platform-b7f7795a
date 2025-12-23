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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VoidTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    type: string;
    amount: number;
    asset: string;
    investorName: string;
    txDate: string;
    isSystemGenerated?: boolean;
  } | null;
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
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("void_transaction", {
        p_transaction_id: transaction.id,
        p_reason: reason.trim(),
      });

      if (error) throw error;

      toast.success("Transaction voided successfully");
      setReason("");
      setConfirmText("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error voiding transaction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to void transaction");
    } finally {
      setLoading(false);
    }
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
            <Alert variant="destructive" className="border-destructive/50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <AlertDescription className="font-medium">
                    System-generated transaction
                  </AlertDescription>
                  <p className="text-xs text-destructive/80 mt-1">
                    This transaction was automatically created by yield distributions, fee calculations, 
                    or IB allocations. Voiding system transactions is blocked to maintain ledger integrity.
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button"
                          className="text-xs underline text-destructive/70 hover:text-destructive mt-1.5 flex items-center gap-1"
                        >
                          <Info className="h-3 w-3" />
                          Why can't I void this?
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[300px] text-xs">
                        <p>System transactions are linked to yield distribution periods and correction runs. 
                        Voiding them would create inconsistencies in investor statements and AUM calculations.</p>
                        <p className="mt-1.5 font-medium">Instead, use "Yield Correction" to properly adjust past distributions with full audit trail.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleVoid}
            disabled={loading || confirmText !== "VOID" || reason.trim().length < 3}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Void Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
