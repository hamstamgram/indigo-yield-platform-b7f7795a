/**
 * Requests Queue Mutations
 * React Query mutations for withdrawal request actions
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { requestsQueueService } from "@/services";
import { invalidateAfterWithdrawal } from "@/utils/cacheInvalidation";
import type { ApproveWithdrawalParams, RejectWithdrawalParams, WithdrawalRequest } from "@/types/domains/requests";

interface UseRequestsQueueMutationsOptions {
  withdrawalRequests?: WithdrawalRequest[];
  onSuccess?: () => void;
}

/**
 * Hook providing mutations for approving/rejecting withdrawals with optimistic updates
 */
export function useRequestsQueueMutations(options: UseRequestsQueueMutationsOptions = {}) {
  const { withdrawalRequests, onSuccess } = options;
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (params: ApproveWithdrawalParams) => 
      requestsQueueService.approveWithdrawal(params),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["admin", "withdrawal-requests"] });
      
      // Snapshot for rollback
      const previousRequests = queryClient.getQueryData(["admin", "withdrawal-requests"]);
      
      // Optimistic update - mark as approved
      queryClient.setQueryData(["admin", "withdrawal-requests"], (old: WithdrawalRequest[] | undefined) => 
        old?.map(r => r.id === variables.requestId ? { ...r, status: "approved" } : r)
      );
      
      return { previousRequests };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousRequests) {
        queryClient.setQueryData(["admin", "withdrawal-requests"], context.previousRequests);
      }
      toast.error(`Failed to approve withdrawal: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Withdrawal request approved successfully");
      onSuccess?.();
    },
    onSettled: (_, __, variables) => {
      const request = withdrawalRequests?.find((r) => r.id === variables.requestId);
      invalidateAfterWithdrawal(queryClient, request?.investor_id, request?.fund_id);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (params: RejectWithdrawalParams) => 
      requestsQueueService.rejectWithdrawal(params),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["admin", "withdrawal-requests"] });
      
      // Snapshot for rollback
      const previousRequests = queryClient.getQueryData(["admin", "withdrawal-requests"]);
      
      // Optimistic update - mark as rejected
      queryClient.setQueryData(["admin", "withdrawal-requests"], (old: WithdrawalRequest[] | undefined) => 
        old?.map(r => r.id === variables.requestId ? { ...r, status: "rejected" } : r)
      );
      
      return { previousRequests };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousRequests) {
        queryClient.setQueryData(["admin", "withdrawal-requests"], context.previousRequests);
      }
      toast.error(`Failed to reject withdrawal: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Withdrawal request rejected");
      onSuccess?.();
    },
    onSettled: (_, __, variables) => {
      const request = withdrawalRequests?.find((r) => r.id === variables.requestId);
      invalidateAfterWithdrawal(queryClient, request?.investor_id, request?.fund_id);
    },
  });

  return {
    approveMutation,
    rejectMutation,
  };
}
