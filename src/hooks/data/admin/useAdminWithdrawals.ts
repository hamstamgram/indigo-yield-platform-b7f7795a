/**
 * Admin Withdrawals Hooks
 * React Query hooks for withdrawal management
 */

import { useQuery } from "@tanstack/react-query";
import { withdrawalService } from "@/services/investor/withdrawalService";
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
} from "@/types/withdrawal";

// ==================== Hooks ====================

/**
 * Hook to fetch paginated withdrawals with filters
 */
export function useAdminWithdrawals(filters?: WithdrawalFilters) {
  return useQuery<PaginatedWithdrawals, Error>({
    queryKey: [...QUERY_KEYS.withdrawals, "admin", filters],
    queryFn: () => withdrawalService.getWithdrawals(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch withdrawal statistics
 */
export function useWithdrawalStats() {
  return useQuery<WithdrawalStats, Error>({
    queryKey: [...QUERY_KEYS.withdrawals, "stats"],
    queryFn: () => withdrawalService.getStats(),
    staleTime: 30 * 1000,
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
 */
export function useWithdrawalsWithStats(filters?: WithdrawalFilters) {
  const withdrawalsQuery = useAdminWithdrawals(filters);
  const statsQuery = useWithdrawalStats();

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
