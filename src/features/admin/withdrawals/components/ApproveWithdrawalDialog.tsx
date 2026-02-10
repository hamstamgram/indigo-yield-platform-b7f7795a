import { useState, useEffect } from "react";
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
  Checkbox,
} from "@/components/ui";
import { withdrawalService } from "@/services/investor";
import { getCurrentFundAum } from "@/services/admin/depositWithYieldService";
import { useWithdrawalMutations } from "@/hooks/data";
import { useAuth } from "@/services/auth";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
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
  const { user } = useAuth();
  const [processedAmount, setProcessedAmount] = useState(withdrawal.requested_amount.toString());
  const [txHash, setTxHash] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState("");
  const [routeToFees, setRouteToFees] = useState(false);

  const { routeToFeesMutation } = useWithdrawalMutations();

  // Reset state when dialog opens with new withdrawal
  useEffect(() => {
    if (open) {
      setProcessedAmount(withdrawal.requested_amount.toString());
      setTxHash("");
      setAdminNotes("");
      setConfirmText("");
      setRouteToFees(false);
      setSubmittingStep("");
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

      // Step 1: Approve
      setSubmittingStep("Approving...");
      const { correlationId } = await withdrawalService.approveWithdrawal(
        withdrawal.id,
        amount,
        adminNotes
      );

      // Step 2: Mark as processing
      setSubmittingStep("Processing...");
      await withdrawalService.markAsProcessing(
        withdrawal.id,
        txHash || undefined,
        adminNotes || undefined,
        correlationId
      );

      // Step 3: Auto-fetch closing AUM and complete
      setSubmittingStep("Completing...");
      const closingAum = await getCurrentFundAum(withdrawal.fund_id);
      await withdrawalService.markAsCompleted(
        withdrawal.id,
        String(closingAum),
        txHash || undefined,
        adminNotes || undefined,
        correlationId
      );

      toast.success("Withdrawal approved and completed. Ledger entries created.");

      // If route to fees is checked, use the mutation
      if (routeToFees) {
        routeToFeesMutation.mutate({
          withdrawalId: withdrawal.id,
          reason: adminNotes
            ? `${adminNotes} (routed on approval)`
            : "Routed to INDIGO FEES on approval",
          investorId: withdrawal.investor_id,
          fundId: withdrawal.fund_id,
          actorId: user?.id || "system",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      logError("withdrawal.approveAndComplete", error, { withdrawalId: withdrawal.id });
      const message = error instanceof Error ? error.message : "Failed to process withdrawal";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setSubmittingStep("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Approve Withdrawal Request</DialogTitle>
          <DialogDescription>
            Review and approve the withdrawal request for {withdrawal.investor_name}. This will
            approve, process, and complete the withdrawal in one step.
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
                placeholder="Add any notes about this withdrawal..."
                rows={2}
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
                  Route to INDIGO FEES after completion
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Creates internal transactions to transfer funds to the INDIGO FEES account
                </p>
              </div>
            </div>

            {/* Warning and Typed Confirmation */}
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>This action is irreversible</strong>
                <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                  <li>A WITHDRAWAL transaction will be created in the ledger</li>
                  <li>The investor&apos;s position will be reduced by the processed amount</li>
                  <li>Yield will be crystallized using current fund AUM</li>
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
                  {submittingStep}
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
