/**
 * Admin Investor Mutations
 * React Query hooks for admin investor lifecycle and performance operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  updateInvestorStatus,
  lockPositions,
  cleanupInactiveInvestors,
  getPendingWithdrawalsCount,
  updateFundPerformance,
  type InvestorStatus,
  type CleanupResult,
  type AdminPerformanceUpdateData as PerformanceUpdateData,
} from "@/services";

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
    mutationFn: ({
      investorId,
      status,
    }: {
      investorId: string;
      status: InvestorStatus;
    }) => updateInvestorStatus(investorId, status),
    onSuccess: (_, { investorId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investors });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.investorOverview(investorId),
      });
    },
  });
}

/**
 * Mutation to lock investor positions
 */
export function useLockPositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investorId,
      lockUntil,
      reason,
    }: {
      investorId: string;
      lockUntil: string;
      reason?: string;
    }) => lockPositions(investorId, lockUntil, reason),
    onSuccess: (_, { investorId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investors });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investors });
    },
  });
}

/**
 * Mutation to update fund performance data
 */
export function useUpdateFundPerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      performanceId,
      data,
    }: {
      performanceId: string;
      data: PerformanceUpdateData;
    }) => updateFundPerformance(performanceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInvestorPerformance });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investors });
    },
  });
}
