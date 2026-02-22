/**
 * Admin Withdrawals Hooks
 * React Query hooks for withdrawal management
 */

import { useQuery } from "@tanstack/react-query";
import { withdrawalService } from "@/features/investor/withdrawals/services/withdrawalService";
import {
  WithdrawalFilters,
  WithdrawalStats,
  PaginatedWithdrawals,
  Withdrawal,
  WithdrawalAuditLog,
} from "@/types/domains";
import { QUERY_KEYS } from "@/constants/queryKeys";

// ==================== Re-export types ====================

export type {
  WithdrawalFilters,
  WithdrawalStats,
  PaginatedWithdrawals,
  Withdrawal,
  WithdrawalAuditLog,
} from "@/types/domains";

// ==================== Hooks ====================

/**
 * Hook to fetch paginated withdrawals with filters
 */
export function useAdminWithdrawals(filters?: WithdrawalFilters) {
  return useQuery<PaginatedWithdrawals, Error>({
    queryKey: [...QUERY_KEYS.withdrawals, "admin", filters],
    queryFn: () => withdrawalService.getWithdrawals(filters),
    staleTime: 60 * 1000, // 60 seconds
  });
}

/**
 * Hook to fetch withdrawal statistics
 * Accepts optional filters to match list query for consistent totals
 */
export function useWithdrawalStats(filters?: WithdrawalFilters) {
  return useQuery<WithdrawalStats, Error>({
    queryKey: [...QUERY_KEYS.withdrawals, "stats", filters],
    queryFn: () => withdrawalService.getStats(filters),
    staleTime: 60 * 1000, // 60 seconds
  });
}

/**
 * Hook to fetch a single withdrawal by ID
 */
export function useWithdrawalById(id: string | null | undefined) {
  return useQuery<Withdrawal | null, Error>({
    queryKey: [...QUERY_KEYS.withdrawals, id],
    queryFn: () => {
      if (!id) throw new Error("No withdrawal ID provided");
      return withdrawalService.getWithdrawalById(id);
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch withdrawal audit logs
 */
export function useWithdrawalAuditLogs(withdrawalId: string | null | undefined) {
  return useQuery<WithdrawalAuditLog[], Error>({
    queryKey: [...QUERY_KEYS.withdrawals, withdrawalId, "audit"],
    queryFn: () => {
      if (!withdrawalId) throw new Error("No withdrawal ID provided");
      return withdrawalService.getWithdrawalAuditLogs(withdrawalId);
    },
    enabled: !!withdrawalId,
  });
}

/**
 * Combined hook to fetch both withdrawals and stats (useful for main page)
 * Stats are filtered to match the list for consistent totals
 */
export function useWithdrawalsWithStats(filters?: WithdrawalFilters) {
  const withdrawalsQuery = useAdminWithdrawals(filters);
  const statsQuery = useWithdrawalStats(filters);

  return {
    withdrawals: withdrawalsQuery.data,
    stats: statsQuery.data,
    isLoading: withdrawalsQuery.isLoading || statsQuery.isLoading,
    isError: withdrawalsQuery.isError || statsQuery.isError,
    error: withdrawalsQuery.error || statsQuery.error,
    refetch: async () => {
      await Promise.all([withdrawalsQuery.refetch(), statsQuery.refetch()]);
    },
  };
}
