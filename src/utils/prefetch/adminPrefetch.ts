/**
 * Admin Route Prefetch Configuration
 * Maps admin routes to their prefetch functions for proactive data loading
 */

import { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { fetchAdminStats } from "@/features/admin/dashboard/services/adminStatsService";
import { withdrawalService } from "@/features/investor/withdrawals/services/withdrawalService";
import { transactionService } from "@/services/shared/transactionService";
import * as fundService from "@/features/admin/funds/services/fundService";

type PrefetchFn = (queryClient: QueryClient) => Promise<void>;

/**
 * Route-to-prefetch mapping for admin pages
 * Each route maps to a function that prefetches its primary data
 */
export const ADMIN_ROUTE_PREFETCH: Record<string, PrefetchFn> = {
  "/admin": async (qc) => {
    await qc.prefetchQuery({
      queryKey: QUERY_KEYS.adminDashboard,
      queryFn: () => fetchAdminStats(),
      staleTime: 60 * 1000,
    });
  },

  "/admin/withdrawals": async (qc) => {
    await qc.prefetchQuery({
      queryKey: QUERY_KEYS.withdrawals,
      queryFn: () => withdrawalService.getWithdrawals(),
      staleTime: 60 * 1000,
    });
  },

  "/admin/transactions": async (qc) => {
    await qc.prefetchQuery({
      queryKey: QUERY_KEYS.transactions(),
      queryFn: () => transactionService.fetchUserTransactions(),
      staleTime: 60 * 1000,
    });
  },

  "/admin/funds": async (qc) => {
    await qc.prefetchQuery({
      queryKey: QUERY_KEYS.funds,
      queryFn: () => fundService.getActiveFunds(),
      staleTime: 2 * 60 * 1000, // Funds change less frequently
    });
  },
};

/**
 * High-priority routes to prefetch on admin page load
 */
export const HIGH_PRIORITY_ADMIN_ROUTES = ["/admin", "/admin/transactions"];

/**
 * Check if a route has a prefetch function defined
 */
export function hasPrefetchFn(route: string): boolean {
  return route in ADMIN_ROUTE_PREFETCH;
}

/**
 * Get the prefetch function for a route
 */
export function getPrefetchFn(route: string): PrefetchFn | undefined {
  return ADMIN_ROUTE_PREFETCH[route];
}
