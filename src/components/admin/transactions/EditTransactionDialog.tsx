/**
 * Edit Transaction Dialog
 * Allows admins to edit specific fields on a transaction with reason
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Button, Input, Label, Textarea,
  Alert, AlertDescription,
} from "@/components/ui";
import { Pencil, Loader2, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTransactionMutations } from "@/hooks/data/useTransactionMutations";

const editSchema = z.object({
  tx_date: z.string().optional(),
  amount: z.string().optional(),
  notes: z.string().optional(),
  tx_hash: z.string().optional(),
  reason: z.string().min(1, "Edit reason is required"),
});

type EditFormData = z.infer<typeof editSchema>;

/**
 * Minimal transaction data required for the edit dialog
 */
interface EditableTransaction {
  id: string;
  type: string;
  amount: number;
  asset: string;
  investorName: string;
  txDate: string;
  notes: string | null;
  txHash?: string | null;
  isSystemGenerated?: boolean;
  // Optional fields for cache invalidation
  investorId?: string;
  fundId?: string | null;
}

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: EditableTransaction | null;
  onSuccess: () => void;
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: EditTransactionDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const { updateMutation } = useTransactionMutations();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      reason: "",
    },
  });

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      reset({
        tx_date: transaction.txDate,
        amount: transaction.amount.toString(),
        notes: transaction.notes || "",
        tx_hash: transaction.txHash || "",
        reason: "",
      });
      setConfirmText("");
    }
  }, [transaction, reset]);

  const onSubmit = async (data: EditFormData) => {
    if (!transaction) return;

    if (confirmText !== "EDIT") {
      toast.error("Please type EDIT to confirm");
      return;
    }

    // Build updates object with only changed fields
    const updates: Record<string, any> = {};
    
    if (data.tx_date && data.tx_date !== transaction.txDate) {
      updates.tx_date = data.tx_date;
    }
    if (data.amount && parseFloat(data.amount) !== transaction.amount) {
      updates.amount = parseFloat(data.amount);
    }
    if (data.notes !== (transaction.notes || "")) {
      updates.notes = data.notes;
    }
    if (data.tx_hash !== (transaction.txHash || "")) {
      updates.tx_hash = data.tx_hash;
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      return;
    }

    updateMutation.mutate(
      {
        transactionId: transaction.id,
        updates,
        reason: data.reason.trim(),
        investorId: transaction.investorId,
        fundId: transaction.fundId || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onSuccess();
          onOpenChange(false);
        },
      }
    );
  };

  const handleClose = () => {
    reset();
    setConfirmText("");
    onOpenChange(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Transaction
          </DialogTitle>
          <DialogDescription>
            Modify transaction details. Changes are audited and trigger position recalculation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Transaction info */}
          <Alert>
            <AlertDescription>
              <div><strong>Investor:</strong> {transaction.investorName}</div>
              <div><strong>Type:</strong> {transaction.type} — {transaction.asset}</div>
            </AlertDescription>
          </Alert>

          {transaction.isSystemGenerated && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>System-generated transactions cannot be edited.</strong>
                <p className="text-sm mt-1">This transaction was created automatically by the system (e.g., yield distribution, fee allocation). Close this dialog to cancel.</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tx_date">Transaction Date</Label>
              <Input
                id="tx_date"
                type="date"
                {...register("tx_date")}
                disabled={transaction.isSystemGenerated}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({transaction.asset})</Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                {...register("amount")}
                disabled={transaction.isSystemGenerated}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx_hash">Transaction Hash</Label>
            <Input
              id="tx_hash"
              placeholder="Optional blockchain tx hash"
              {...register("tx_hash")}
              disabled={transaction.isSystemGenerated}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Transaction notes"
              {...register("notes")}
              rows={2}
              disabled={transaction.isSystemGenerated}
            />
          </div>

          <hr />

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for edit *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this transaction is being modified..."
              {...register("reason")}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Required for audit trail
            </p>
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmText">Type EDIT to confirm</Label>
            <Input
              id="confirmText"
              placeholder="Type EDIT"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            {transaction.isSystemGenerated ? (
              <Button type="button" variant="secondary" disabled className="cursor-not-allowed">
                <Lock className="mr-2 h-4 w-4" />
                Cannot Edit System Transaction
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={updateMutation.isPending || confirmText !== "EDIT"}
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
