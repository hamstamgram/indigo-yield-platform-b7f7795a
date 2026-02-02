/**
 * useApprovals - React hooks for the approval system
 * Provides queries and mutations for 2-person rule workflow
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { approvalService } from "@/services/admin/approvalService";
import { useAuth } from "@/services/auth";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type {
  PendingApproval,
  ApprovalHistoryItem,
  RequestApprovalInput,
} from "@/types/domains/approval";

/**
 * Fetch all pending approvals
 */
export function usePendingApprovals() {
  return useQuery({
    queryKey: QUERY_KEYS.approvalsPending,
    queryFn: () => approvalService.getPendingApprovals(),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Fetch pending approvals that the current user can action
 * (excludes their own requests)
 */
export function usePendingForUser() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.approvalsPendingForUser(user?.id || ""),
    queryFn: () => approvalService.getPendingForUser(user!.id),
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

/**
 * Fetch current user's own pending requests
 */
export function useMyPendingRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.approvalsMyRequests(user?.id || ""),
    queryFn: () => approvalService.getMyPendingRequests(user!.id),
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

/**
 * Fetch approval history
 */
export function useApprovalHistory(limit = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.approvalsHistory,
    queryFn: () => approvalService.getApprovalHistory(limit),
    staleTime: 60000,
  });
}

/**
 * Fetch approval thresholds configuration
 */
export function useApprovalThresholds() {
  return useQuery({
    queryKey: QUERY_KEYS.approvalsThresholds,
    queryFn: () => approvalService.getThresholds(),
    staleTime: 300000, // 5 minutes - thresholds don't change often
  });
}

/**
 * Fetch pending approval count for badge display
 */
export function usePendingApprovalCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.approvalsPendingCount(user?.id || ""),
    queryFn: () => approvalService.getPendingCount(user!.id),
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

/**
 * Check approval integrity
 */
export function useApprovalIntegrity() {
  return useQuery({
    queryKey: QUERY_KEYS.approvalsIntegrity,
    queryFn: () => approvalService.checkIntegrity(),
    staleTime: 300000,
  });
}

/**
 * Approval mutations hook
 */
export function useApprovalMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.approvals });
  };

  // Request approval
  const requestMutation = useMutation({
    mutationFn: (input: RequestApprovalInput) => approvalService.requestApproval(input, user!.id),
    onSuccess: (result, input) => {
      if (result.success) {
        toast.success("Approval request submitted. Awaiting second administrator.");
        invalidateAll();
      } else {
        toast.error(result.error || "Failed to request approval");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to request approval: ${error.message}`);
    },
  });

  // Approve request
  const approveMutation = useMutation({
    mutationFn: ({ approvalId, notes }: { approvalId: string; notes?: string }) =>
      approvalService.approveRequest(approvalId, user!.id, notes),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Request approved successfully.");
        invalidateAll();
      } else {
        toast.error(result.error || "Failed to approve request");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  // Reject request
  const rejectMutation = useMutation({
    mutationFn: ({ approvalId, reason }: { approvalId: string; reason: string }) =>
      approvalService.rejectRequest(approvalId, user!.id, reason),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Request rejected.");
        invalidateAll();
      } else {
        toast.error(result.error || "Failed to reject request");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  // Cleanup expired
  const cleanupMutation = useMutation({
    mutationFn: () => approvalService.cleanupExpired(),
    onSuccess: (result) => {
      toast.success(`Cleaned up ${result.expiredCount} expired approvals.`);
      invalidateAll();
    },
    onError: (error: Error) => {
      toast.error(`Failed to cleanup: ${error.message}`);
    },
  });

  return {
    requestApproval: requestMutation.mutateAsync,
    approveRequest: approveMutation.mutateAsync,
    rejectRequest: rejectMutation.mutateAsync,
    cleanupExpired: cleanupMutation.mutateAsync,
    isRequesting: requestMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isCleaning: cleanupMutation.isPending,
  };
}

/**
 * Combined approvals state hook
 */
export function useApprovals() {
  const pendingForUser = usePendingForUser();
  const myRequests = useMyPendingRequests();
  const history = useApprovalHistory();
  const thresholds = useApprovalThresholds();
  const pendingCount = usePendingApprovalCount();
  const mutations = useApprovalMutations();

  return {
    // Queries
    pendingApprovals: pendingForUser.data || [],
    myRequests: myRequests.data || [],
    history: history.data || [],
    thresholds: thresholds.data,
    pendingCount: pendingCount.data || 0,

    // Loading states
    isLoadingPending: pendingForUser.isLoading,
    isLoadingMyRequests: myRequests.isLoading,
    isLoadingHistory: history.isLoading,

    // Errors
    pendingError: pendingForUser.error,
    historyError: history.error,

    // Mutations
    ...mutations,

    // Refetch
    refetchPending: pendingForUser.refetch,
    refetchMyRequests: myRequests.refetch,
    refetchHistory: history.refetch,
  };
}

/**
 * Hook to check if current user can approve a specific approval
 */
export function useCanApprove(approval: PendingApproval | null) {
  const { user } = useAuth();

  if (!approval || !user) return false;

  // Cannot approve own request
  return approval.requested_by !== user.id;
}
