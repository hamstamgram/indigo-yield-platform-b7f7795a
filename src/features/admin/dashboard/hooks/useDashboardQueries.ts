/**
 * Dashboard Query Hooks
 * React Query hooks for dashboard widgets
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { fetchFundsWithAUM, fetchRecentActivities, fetchPendingItems } from "@/services/admin";
import type { Fund } from "@/types/domains/fund";

/**
 * Hook to fetch funds with their current AUM
 */
export function useFundsWithAUM(baseFunds: Fund[] | undefined) {
  const fundIds = baseFunds?.map((f) => f.id) || [];

  return useQuery({
    queryKey: QUERY_KEYS.fundsWithAum(fundIds),
    queryFn: () => fetchFundsWithAUM(fundIds),
    enabled: !!baseFunds && baseFunds.length > 0,
  });
}

/**
 * Hook to fetch recent activity items
 */
export function useRecentActivities() {
  return useQuery({
    queryKey: QUERY_KEYS.recentActivities,
    queryFn: fetchRecentActivities,
  });
}

/**
 * Hook to fetch pending action items
 */
export function usePendingItems() {
  return useQuery({
    queryKey: QUERY_KEYS.pendingActions,
    queryFn: fetchPendingItems,
  });
}
