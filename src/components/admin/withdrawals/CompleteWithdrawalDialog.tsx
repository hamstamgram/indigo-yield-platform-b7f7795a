import { useState, useEffect } from "react";
import { Withdrawal } from "@/types/domains";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Button, Input, Label, Textarea,
  Alert, AlertDescription,
} from "@/components/ui";
import { withdrawalService } from "@/services/investor/withdrawalService";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatAssetAmount } from "@/utils/assets";

interface CompleteWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal;
  onSuccess: () => void;
}

export function CompleteWithdrawalDialog({
  open,
  onOpenChange,
  withdrawal,
  onSuccess,
}: CompleteWithdrawalDialogProps) {
  const [txHash, setTxHash] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTxHash(withdrawal.tx_hash || "");
      setAdminNotes("");
      setConfirmText("");
    }
  }, [open, withdrawal.tx_hash]);

  const isConfirmed = confirmText.toUpperCase() === "COMPLETE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConfirmed) {
      toast.error("Please type COMPLETE to confirm");
      return;
    }
    
    setIsSubmitting(true);

    try {
      await withdrawalService.markAsCompleted(withdrawal.id, txHash || undefined, adminNotes || undefined);
      toast.success("Withdrawal completed successfully. Ledger entries created.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing withdrawal:", error);
      toast.error(error instanceof Error ? error.message : "Failed to complete withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Complete Withdrawal
          </DialogTitle>
          <DialogDescription>
            Finalize the withdrawal and create ledger entries for {withdrawal.investor_name}
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
                <Label className="text-sm font-medium">Amount to Deduct</Label>
                <p className="text-sm font-medium text-foreground">
                  {formatAssetAmount(withdrawal.processed_amount || withdrawal.requested_amount, withdrawal.fund_class || "UNITS")}
                </p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="txHash">Transaction Hash</Label>
              <Input
                id="txHash"
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Blockchain transaction hash for the withdrawal
              </p>
            </div>
            
            <div>
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any completion notes..."
                rows={2}
              />
            </div>
            
            {/* Warning and Typed Confirmation */}
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>This action is irreversible</strong>
                <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                  <li>A WITHDRAWAL transaction will be created in the ledger</li>
                  <li>The investor&apos;s position will be reduced by the processed amount</li>
                  <li>This operation is idempotent (safe to retry)</li>
                </ul>
                <p className="mt-2 text-sm">
                  Type <strong>COMPLETE</strong> below to confirm.
                </p>
              </AlertDescription>
            </Alert>
            
            <div>
              <Label htmlFor="confirmText">Type COMPLETE to confirm *</Label>
              <Input
                id="confirmText"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="COMPLETE"
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
            <Button 
              type="submit" 
              disabled={isSubmitting || !isConfirmed}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Withdrawal
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
