/**
 * Admin Fees Hooks
 * React Query hooks for fee overview data
 */

import { useQuery } from "@tanstack/react-query";
import {
  getFeesOverviewData,
  getActiveFunds,
  getFeeTransactions,
  getIndigoFeesBalance,
  getFeeAllocations,
  getRoutingAuditEntries,
  getYieldEarned,
  type FeesOverviewData,
  type FeeRecord,
  type Fund,
  type FeeAllocation,
  type RoutingAuditEntry,
  type RoutingSummary,
  type YieldEarned,
} from "@/services/admin/feesService";
import { QUERY_KEYS } from "@/constants/queryKeys";

// ==================== Re-export types ====================

export type {
  FeesOverviewData,
  FeeRecord,
  Fund,
  FeeAllocation,
  RoutingAuditEntry,
  RoutingSummary,
  YieldEarned,
  FeeSummary,
} from "@/services/admin/feesService";

// ==================== Hooks ====================

/**
 * Hook to fetch all fees overview data in one call
 */
export function useFeesOverview() {
  return useQuery<FeesOverviewData, Error>({
    queryKey: QUERY_KEYS.adminFeesOverview,
    queryFn: getFeesOverviewData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch active funds only
 */
export function useFeeFunds() {
  return useQuery<Fund[], Error>({
    queryKey: [...QUERY_KEYS.adminFeesOverview, "funds"],
    queryFn: getActiveFunds,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch fee transactions only
 */
export function useFeeTransactions() {
  return useQuery<FeeRecord[], Error>({
    queryKey: [...QUERY_KEYS.adminFeesOverview, "transactions"],
    queryFn: getFeeTransactions,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch INDIGO FEES account balance
 */
export function useIndigoFeesBalance() {
  return useQuery<Record<string, number>, Error>({
    queryKey: [...QUERY_KEYS.adminFeesOverview, "balance"],
    queryFn: getIndigoFeesBalance,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch fee allocations (audit trail)
 */
export function useFeeAllocations() {
  return useQuery<FeeAllocation[], Error>({
    queryKey: [...QUERY_KEYS.adminFeesOverview, "allocations"],
    queryFn: getFeeAllocations,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch routing audit entries
 */
export function useRoutingAuditEntries() {
  return useQuery<{ entries: RoutingAuditEntry[]; summary: RoutingSummary }, Error>({
    queryKey: [...QUERY_KEYS.adminFeesOverview, "routing"],
    queryFn: getRoutingAuditEntries,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch yield earned by INDIGO FEES account
 */
export function useYieldEarned(funds: Fund[]) {
  return useQuery<YieldEarned[], Error>({
    queryKey: [...QUERY_KEYS.adminFeesOverview, "yield", funds.map(f => f.id)],
    queryFn: () => getYieldEarned(funds),
    enabled: funds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
