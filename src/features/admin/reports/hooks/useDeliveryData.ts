/**
 * Delivery Data Hooks
 *
 * React Query hooks for fetching delivery-related data.
 * These hooks provide caching, loading states, and refetch capabilities.
 */

import { useQuery } from "@tanstack/react-query";
import { deliveryService } from "@/features/admin/reports/services/deliveryService";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { DeliveryFilters } from "@/types/domains/delivery";

/**
 * Hook to fetch statement periods with their statement counts
 */
export function usePeriodsWithCounts() {
  const query = useQuery({
    queryKey: QUERY_KEYS.statementPeriodsWithCounts,
    queryFn: () => deliveryService.fetchPeriodsWithCounts(),
  });

  return {
    periodsWithCounts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch delivery statistics for a specific period
 */
export function useDeliveryStats(periodId: string) {
  const query = useQuery({
    queryKey: QUERY_KEYS.deliveryStats(periodId),
    queryFn: () => deliveryService.fetchDeliveryStats(periodId),
    enabled: !!periodId,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch delivery records for a period with filters
 */
export function useDeliveries(periodId: string, filters: DeliveryFilters) {
  const query = useQuery({
    queryKey: QUERY_KEYS.deliveries(periodId, filters as unknown as Record<string, unknown>),
    queryFn: () => deliveryService.fetchDeliveries(periodId, filters),
    enabled: !!periodId,
  });

  return {
    deliveries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
