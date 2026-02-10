import { useState, useEffect, useRef } from "react";
import { Withdrawal } from "@/types/domains";
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
import { withdrawalService } from "@/services/investor";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { formatAssetAmount } from "@/utils/assets";
import { Loader2, AlertTriangle } from "lucide-react";

interface ApproveWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal;
  onSuccess: () => void;
}

export function ApproveWithdrawalDialog({
  open,
  onOpenChange,
  withdrawal,
  onSuccess,
}: ApproveWithdrawalDialogProps) {
  const [processedAmount, setProcessedAmount] = useState(withdrawal.requested_amount.toString());
  const [txHash, setTxHash] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setProcessedAmount(withdrawal.requested_amount.toString());
      setTxHash("");
      setAdminNotes("");
      setConfirmText("");
    }
  }, [open, withdrawal.requested_amount]);

  const isConfirmed = confirmText.toUpperCase() === "APPROVE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current) return;
    if (!isConfirmed) {
      toast.error("Please type APPROVE to confirm");
      return;
    }

    const amount = parseFloat(processedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await withdrawalService.approveAndComplete(
        withdrawal.id,
        processedAmount,
        txHash || undefined,
        adminNotes || undefined
      );
      toast.success("Withdrawal approved and completed. Ledger updated.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      logError("withdrawal.approveAndComplete", error, { withdrawalId: withdrawal.id });
      const message = error instanceof Error ? error.message : "Failed to process withdrawal";
      toast.error(message);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Approve Withdrawal</DialogTitle>
          <DialogDescription>
            Approve and complete the withdrawal for {withdrawal.investor_name}. The investor&apos;s
            position will be reduced immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Investor</Label>
                <p className="text-sm text-muted-foreground">{withdrawal.investor_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Fund</Label>
                <p className="text-sm text-muted-foreground">
                  {withdrawal.fund_name || withdrawal.fund_class || "N/A"}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Requested Amount</Label>
              <p className="text-sm text-muted-foreground">
                {formatAssetAmount(withdrawal.requested_amount, withdrawal.fund_class || "UNITS")}
              </p>
            </div>
            <div>
              <Label htmlFor="processedAmount">Processed Amount *</Label>
              <Input
                id="processedAmount"
                type="number"
                step="0.00000001"
                min="0"
                value={processedAmount}
                onChange={(e) => setProcessedAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Adjust if processing fees apply</p>
            </div>
            <div>
              <Label htmlFor="txHash">Transaction Hash (Optional)</Label>
              <Input
                id="txHash"
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div>
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={2}
              />
            </div>

            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>This action is irreversible</strong>
                <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                  <li>A WITHDRAWAL transaction will be created in the ledger</li>
                  <li>The investor&apos;s position will be reduced immediately</li>
                </ul>
                <p className="mt-2 text-sm">
                  Type <strong>APPROVE</strong> below to confirm.
                </p>
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="confirmText">Type APPROVE to confirm *</Label>
              <Input
                id="confirmText"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="APPROVE"
                className={confirmText && !isConfirmed ? "border-destructive" : ""}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isConfirmed}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Approve & Complete"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
