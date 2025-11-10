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
import { depositService } from "@/services/depositService";
import type { Deposit } from "@/types/deposit";

interface RejectDepositDialogProps {
  deposit: Deposit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RejectDepositDialog({
  deposit,
  open,
  onOpenChange,
}: RejectDepositDialogProps) {
  const queryClient = useQueryClient();

  const rejectMutation = useMutation({
    mutationFn: (id: string) => depositService.rejectDeposit(id),
    onSuccess: () => {
      toast.success("Deposit rejected");
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      queryClient.invalidateQueries({ queryKey: ["deposit-stats"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject deposit: ${error.message}`);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Deposit</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reject this deposit? This action will mark the
            deposit as rejected and cannot be undone.
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
            <span className="text-sm font-medium">
              {deposit.amount.toLocaleString()}
            </span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => rejectMutation.mutate(deposit.id)}
            disabled={rejectMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {rejectMutation.isPending ? "Rejecting..." : "Reject Deposit"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
