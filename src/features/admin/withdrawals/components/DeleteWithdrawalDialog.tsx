import { useState } from "react";
import { Withdrawal } from "@/types/domains";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Textarea,
  Input,
  Label,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useWithdrawalMutations } from "@/features/admin/withdrawals/hooks/useWithdrawalMutations";

interface DeleteWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal | null;
  onSuccess?: () => void;
}

export function DeleteWithdrawalDialog({
  open,
  onOpenChange,
  withdrawal,
  onSuccess,
}: DeleteWithdrawalDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const { deleteMutation } = useWithdrawalMutations();

  const isConfirmed = confirmText === "DELETE";

  const handleSubmit = async () => {
    if (!withdrawal || !isConfirmed || !reason.trim()) return;

    deleteMutation.mutate(
      {
        withdrawalId: withdrawal.id,
        reason,
        hardDelete: false,
        investorId: withdrawal.investor_id,
        fundId: withdrawal.fund_id,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason("");
          setConfirmText("");
          onSuccess?.();
        },
      }
    );
  };

  if (!withdrawal) return null;

  const canDelete = true;
  const amount = withdrawal.processed_amount || withdrawal.requested_amount;
  const asset = withdrawal.asset || withdrawal.fund_class || "UNITS";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Cancel Withdrawal
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-left space-y-3 text-sm text-muted-foreground">
              {!canDelete ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cannot delete completed withdrawals. Use a reversal transaction instead.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <p>
                    You are about to cancel this withdrawal request.
                  </p>
                  <div className="bg-muted rounded-md p-3 space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Investor:</span>{" "}
                      <span className="font-medium text-foreground">
                        {withdrawal.investor_name}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Amount:</span>{" "}
                      <span className="font-medium text-foreground">
                        {amount.toLocaleString()} {asset.toUpperCase()}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <span className="font-medium text-foreground capitalize">
                        {withdrawal.status}
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {canDelete && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-reason">Reason for Cancellation *</Label>
              <Textarea
                id="delete-reason"
                placeholder="Why are you cancelling this withdrawal?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Type <strong>DELETE</strong> to confirm. This action is logged for audit purposes.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete">Confirm by typing DELETE</Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={!canDelete || deleteMutation.isPending || !isConfirmed || !reason.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cancelling...
              </>
            ) : (
              "Cancel Withdrawal"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
