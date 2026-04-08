/**
 * Admin Fees Hooks
 * React Query hooks for fee overview data
 */

import { useQuery } from "@tanstack/react-query";
import { getActiveFunds } from "@/features/admin/funds/services/fundService";
import {
  getFeesOverviewData,
  getFeeTransactions,
  getIndigoFeesBalance,
  getFeeAllocations,
  getYieldEarned,
  type FeesOverviewData,
  type FeeRecord,
  type FeeAllocation,
  type YieldEarned,
  type FeeSummary,
} from "@/features/admin/investors/services/feesService";
import type { FundRef } from "@/types/domains/fund";
import { QUERY_KEYS } from "@/constants/queryKeys";

// ==================== Re-export types ====================

export type { FeesOverviewData, FeeRecord, FeeAllocation, YieldEarned, FeeSummary };
// Use FundRef from canonical source for fund data in fees
export type { FundRef as Fund };

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
  return useQuery<FundRef[], Error>({
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
  return useQuery<Record<string, string>, Error>({
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
 * Hook to fetch yield earned by INDIGO FEES account
 */
export function useYieldEarned(funds: FundRef[]) {
  return useQuery<YieldEarned[], Error>({
    queryKey: [...QUERY_KEYS.adminFeesOverview, "yield", funds.map((f) => f.id)],
    queryFn: () => getYieldEarned(funds),
    enabled: funds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
