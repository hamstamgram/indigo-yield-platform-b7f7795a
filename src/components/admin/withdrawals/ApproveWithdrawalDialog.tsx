import { useState, useEffect } from "react";
import { Withdrawal } from "@/types/domains";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Button, Input, Label, Textarea, Alert, AlertDescription, Checkbox,
} from "@/components/ui";
import { withdrawalService } from "@/services";
import { useWithdrawalMutations } from "@/hooks/data";
import { toast } from "sonner";
import { formatAssetAmount } from "@/utils/assets";
import { Loader2, AlertTriangle, ArrowRightLeft } from "lucide-react";

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
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [routeToFees, setRouteToFees] = useState(false);

  const { routeToFeesMutation } = useWithdrawalMutations();

  // Reset state when dialog opens with new withdrawal
  useEffect(() => {
    if (open) {
      setProcessedAmount(withdrawal.requested_amount.toString());
      setAdminNotes("");
      setConfirmText("");
      setRouteToFees(false);
    }
  }, [open, withdrawal.requested_amount]);

  const isConfirmed = confirmText.toUpperCase() === "APPROVE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConfirmed) {
      toast.error("Please type APPROVE to confirm");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const amount = parseFloat(processedAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      await withdrawalService.approveWithdrawal(withdrawal.id, amount, adminNotes);
      toast.success("Withdrawal approved successfully");

      // If route to fees is checked, use the mutation
      if (routeToFees) {
        routeToFeesMutation.mutate({
          withdrawalId: withdrawal.id,
          reason: adminNotes ? `${adminNotes} (routed on approval)` : "Routed to INDIGO FEES on approval",
          investorId: withdrawal.investor_id,
          fundId: withdrawal.fund_id,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      const message = error instanceof Error ? error.message : "Failed to approve withdrawal";
      toast.error(message);
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
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>

            {/* Route to INDIGO FEES Option */}
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="routeToFees"
                checked={routeToFees}
                onCheckedChange={(checked) => setRouteToFees(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="routeToFees" className="flex items-center gap-2 cursor-pointer">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                  Route to INDIGO FEES after approval
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Creates internal transactions to transfer funds to the INDIGO FEES account
                </p>
              </div>
            </div>
            
            {/* Typed Confirmation Gate */}
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Confirmation Required</strong>
                <p className="mt-1 text-sm">
                  This action cannot be undone. Type <strong>APPROVE</strong> below to confirm.
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
