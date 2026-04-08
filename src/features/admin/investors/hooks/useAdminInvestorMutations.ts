/**
 * Admin Investor Mutations
 * React Query hooks for admin investor lifecycle and performance operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { updateInvestorStatus } from "@/features/admin/investors/services/adminService";
import { cleanupInactiveInvestors, getPendingWithdrawalsCount, type CleanupResult } from "@/features/admin/investors/services/investorLifecycleService";
import { updateFundPerformance, type PerformanceUpdateData as AdminPerformanceUpdateData } from "@/features/admin/investors/services/investorPerformanceService";
import type { InvestorStatus } from "@/features/admin/investors/services/adminService";
type PerformanceUpdateData = AdminPerformanceUpdateData;

/**
 * Query hook for pending withdrawals count
 */
export function usePendingWithdrawalsCount(investorId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.adminPendingWithdrawalsCount(investorId || ""),
    queryFn: () => getPendingWithdrawalsCount(investorId!),
    enabled: !!investorId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Mutation to update investor status
 */
export function useUpdateInvestorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investorId, status }: { investorId: string; status: InvestorStatus }) =>
      updateInvestorStatus(investorId, status),
    onSuccess: (_, { investorId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorsList });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.investorOverview(investorId),
      });
    },
  });
}

/**
 * Mutation to cleanup inactive investors
 */
export function useCleanupInactiveInvestors() {
  const queryClient = useQueryClient();

  return useMutation<CleanupResult, Error, void>({
    mutationFn: () => cleanupInactiveInvestors(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorsList });
    },
  });
}

/**
 * Mutation to update fund performance data
 */
export function useUpdateFundPerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ performanceId, data }: { performanceId: string; data: PerformanceUpdateData }) =>
      updateFundPerformance(performanceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInvestorPerformance });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorsList });
    },
  });
}
