import { useState } from "react";
import { Withdrawal } from "@/types/withdrawal";
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
import { withdrawalService } from "@/services/investor/withdrawalService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const amount = parseFloat(processedAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      await withdrawalService.approveWithdrawal(withdrawal.id, amount, adminNotes);
      toast.success("Withdrawal approved successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      toast.error("Failed to approve withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Approve Withdrawal Request</DialogTitle>
          <DialogDescription>
            Review and approve the withdrawal request for {withdrawal.investor_name}
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
                {withdrawal.requested_amount.toLocaleString()}{" "}
                {(withdrawal.fund_class || "UNITS").toUpperCase()}
              </p>
            </div>
            <div>
              <Label htmlFor="processedAmount">Processed Amount *</Label>
              <Input
                id="processedAmount"
                type="number"
                step="0.01"
                min="0"
                value={processedAmount}
                onChange={(e) => setProcessedAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Adjust if processing fees apply</p>
            </div>
            <div>
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Withdrawal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
