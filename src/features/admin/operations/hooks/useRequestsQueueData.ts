/**
 * Requests Queue Data Hooks
 * React Query hooks for fetching withdrawal and deposit requests
 */

import { useQuery } from "@tanstack/react-query";
import { requestsQueueService } from "@/features/admin/operations/services/requestsQueueService";
import { depositService } from "@/services/investor/depositService";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { WithdrawalRequest, DepositRequest } from "@/types/domains/requests";

/**
 * Hook to fetch all withdrawal requests
 */
export function useWithdrawalRequests() {
  const query = useQuery({
    queryKey: QUERY_KEYS.withdrawalRequestsAdmin,
    queryFn: () => requestsQueueService.fetchWithdrawalRequests(),
  });

  const pendingCount = query.data?.filter((r) => r.status === "pending").length || 0;

  return {
    requests: query.data as WithdrawalRequest[] | undefined,
    pendingCount,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch all deposits for admin queue
 */
export function useDepositsQueue() {
  const query = useQuery({
    queryKey: QUERY_KEYS.depositsAdmin,
    queryFn: () => depositService.getDeposits(),
  });

  const pendingCount = query.data?.filter((d) => d.status === "pending").length || 0;

  return {
    deposits: query.data as DepositRequest[] | undefined,
    pendingCount,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
