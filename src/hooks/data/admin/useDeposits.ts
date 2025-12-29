/**
 * Deposit Hooks
 * React Query hooks for deposit data management
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
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
 * Hook to fetch deposit statistics
 */
export function useDepositStats() {
  return useQuery<DepositStats>({
    queryKey: QUERY_KEYS.depositStats,
    queryFn: () => depositService.getDepositStats(),
  });
}

/**
 * Hook to fetch deposits with optional filters
 */
export function useDeposits(filters?: DepositFilters) {
  return useQuery<Deposit[]>({
    queryKey: QUERY_KEYS.deposits,
    queryFn: () =>
      depositService.getDeposits({
        search: filters?.search,
        status: filters?.status,
      }),
  });
}

// Re-export types
export type { Deposit, DepositStatus };
