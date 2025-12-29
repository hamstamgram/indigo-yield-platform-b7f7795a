/**
 * Requests Queue Mutations
 * React Query mutations for withdrawal request actions
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { requestsQueueService } from "@/services/admin/requestsQueueService";
import { invalidateAfterWithdrawal } from "@/utils/cacheInvalidation";
import type { ApproveWithdrawalParams, RejectWithdrawalParams, WithdrawalRequest } from "@/types/domains/requests";

interface UseRequestsQueueMutationsOptions {
  withdrawalRequests?: WithdrawalRequest[];
  onSuccess?: () => void;
}

/**
 * Hook providing mutations for approving/rejecting withdrawals
 */
export function useRequestsQueueMutations(options: UseRequestsQueueMutationsOptions = {}) {
  const { withdrawalRequests, onSuccess } = options;
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (params: ApproveWithdrawalParams) => 
      requestsQueueService.approveWithdrawal(params),
    onSuccess: (_, variables) => {
      toast.success("Withdrawal request approved successfully");
      const request = withdrawalRequests?.find((r) => r.id === variables.requestId);
      invalidateAfterWithdrawal(queryClient, request?.investor_id, request?.fund_id);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve withdrawal: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (params: RejectWithdrawalParams) => 
      requestsQueueService.rejectWithdrawal(params),
    onSuccess: (_, variables) => {
      toast.success("Withdrawal request rejected");
      const request = withdrawalRequests?.find((r) => r.id === variables.requestId);
      invalidateAfterWithdrawal(queryClient, request?.investor_id, request?.fund_id);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject withdrawal: ${error.message}`);
    },
  });

  return {
    approveMutation,
    rejectMutation,
  };
}
