import { useMutation, useQueryClient } from "@tanstack/react-query";
import { withdrawalService } from "@/services/investor/withdrawalService";
import { 
  CreateWithdrawalParams, 
  UpdateWithdrawalParams, 
  DeleteWithdrawalParams,
  RouteToFeesParams 
} from "@/types/withdrawal";
import { invalidateAfterWithdrawal } from "@/utils/cacheInvalidation";
import { toast } from "sonner";

interface WithdrawalContext {
  investorId?: string;
  fundId?: string;
  withdrawalId?: string;
}

/**
 * Hook providing mutations for withdrawal operations
 */
export function useWithdrawalMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (params: CreateWithdrawalParams) => 
      withdrawalService.createWithdrawal(params),
    onSuccess: (_, params) => {
      invalidateAfterWithdrawal(queryClient, params.investorId, params.fundId);
      toast.success("Withdrawal request created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create withdrawal request");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: UpdateWithdrawalParams & WithdrawalContext) => 
      withdrawalService.updateWithdrawal(params),
    onSuccess: (_, params) => {
      invalidateAfterWithdrawal(
        queryClient, 
        params.investorId, 
        params.fundId, 
        params.withdrawalId
      );
      toast.success("Withdrawal updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update withdrawal");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (params: DeleteWithdrawalParams & WithdrawalContext) => 
      withdrawalService.deleteWithdrawal(params),
    onSuccess: (_, params) => {
      invalidateAfterWithdrawal(queryClient, params.investorId, params.fundId);
      toast.success(params.hardDelete ? "Withdrawal permanently deleted" : "Withdrawal cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete withdrawal");
    },
  });

  const routeToFeesMutation = useMutation({
    mutationFn: (params: RouteToFeesParams & WithdrawalContext) => 
      withdrawalService.routeToFees(params),
    onSuccess: (_, params) => {
      invalidateAfterWithdrawal(
        queryClient, 
        params.investorId, 
        params.fundId, 
        params.withdrawalId
      );
      toast.success("Withdrawal routed to INDIGO FEES successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to route withdrawal to INDIGO FEES");
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    routeToFeesMutation,
  };
}
