import { useState } from "react";
import { Withdrawal } from "@/types/domains";
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
} from "@/components/ui";
import { withdrawalService } from "@/services/investor/withdrawalService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RejectWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal;
  onSuccess: () => void;
}

export function RejectWithdrawalDialog({
  open,
  onOpenChange,
  withdrawal,
  onSuccess,
}: RejectWithdrawalDialogProps) {
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!reason.trim()) {
        toast.error("Please provide a reason for rejection");
        return;
      }

      await withdrawalService.rejectWithdrawal(withdrawal.id, reason, adminNotes);
      toast.success("Withdrawal rejected");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      const message = error instanceof Error ? error.message : "Failed to reject withdrawal";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reject Withdrawal Request</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting the withdrawal request from {withdrawal.investor_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Investor</Label>
              <p className="text-sm text-muted-foreground">{withdrawal.investor_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Requested Amount</Label>
              <p className="text-sm text-muted-foreground">
                {withdrawal.requested_amount.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 8 
                })} {withdrawal.asset || 'tokens'}
              </p>
            </div>
            <div>
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this withdrawal is being rejected..."
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This reason will be visible to the investor
              </p>
            </div>
            <div>
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any internal notes..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">Internal notes only</p>
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
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Withdrawal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
