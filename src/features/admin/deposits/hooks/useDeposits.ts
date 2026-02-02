/**
 * Deposit Hooks
 * React Query hooks for deposit data management
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { STALE_TIME } from "@/constants/queryConfig";
import { depositService } from "@/services/investor/depositService";
import type { Deposit, DepositStatus } from "@/types/domains";

export interface DepositStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  total_amount: number;
  by_asset: Record<string, { count: number; amount: number }>;
}

export interface DepositFilters {
  search?: string;
  status?: DepositStatus;
}

/**
 * Hook to fetch deposit statistics with optional filters
 * Accepts same filters as useDeposits for consistency
 */
export function useDepositStats(filters?: DepositFilters) {
  return useQuery<DepositStats>({
    queryKey: [...QUERY_KEYS.depositStats, filters],
    queryFn: () => depositService.getDepositStats(filters),
    staleTime: STALE_TIME.TRANSACTIONS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch deposits with optional filters
 */
export function useDeposits(filters?: DepositFilters) {
  return useQuery<Deposit[]>({
    queryKey: [...QUERY_KEYS.deposits, filters],
    queryFn: () =>
      depositService.getDeposits({
        search: filters?.search,
        status: filters?.status,
      }),
    staleTime: STALE_TIME.TRANSACTIONS,
    refetchOnWindowFocus: true,
  });
}

// Re-export types
export type { Deposit, DepositStatus };
