import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { depositService } from "@/services/investor/depositService";
import type { Deposit } from "@/types/domains";
import { invalidateAfterDeposit } from "@/utils/cacheInvalidation";

interface ApproveDepositDialogProps {
  deposit: Deposit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApproveDepositDialog({ deposit, open, onOpenChange }: ApproveDepositDialogProps) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (id: string) => depositService.verifyDeposit(id),
    onSuccess: () => {
      toast.success("Deposit verified successfully");
      invalidateAfterDeposit(queryClient, deposit.investor_id);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to verify deposit: ${error.message}`);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Verify Deposit</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to verify this deposit? This action will mark the deposit as
            verified and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">User:</span>
            <span className="text-sm font-medium">{deposit.user_name || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Asset:</span>
            <span className="text-sm font-medium">{deposit.asset_symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Amount:</span>
            <span className="text-sm font-medium">{deposit.amount.toLocaleString()}</span>
          </div>
          {deposit.transaction_hash && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">TX Hash:</span>
              <span className="text-sm font-mono">
                {deposit.transaction_hash.substring(0, 16)}...
              </span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => approveMutation.mutate(deposit.id)}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? "Verifying..." : "Verify Deposit"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
