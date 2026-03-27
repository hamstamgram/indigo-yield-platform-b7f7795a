/**
 * Recorded Yields Page Hooks
 * React Query hooks for yield records management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  getYieldRecords,
  voidYieldDistribution,
  type YieldRecord,
  type YieldFilters,
} from "@/services/admin";
import { invalidateAfterYieldOp } from "@/utils/cacheInvalidation";
import { toast } from "sonner";

export type { YieldRecord, YieldFilters };

/**
 * Hook to fetch yield records with filters
 */
export function useYieldRecords(filters: YieldFilters) {
  return useQuery<YieldRecord[]>({
    queryKey: QUERY_KEYS.recordedYields(filters as unknown as Record<string, unknown>),
    queryFn: () => getYieldRecords(filters),
  });
}

/**
 * Hook to void a yield distribution by distribution ID
 * Use this when voiding a specific distribution (e.g., from YieldDistributionsPage)
 */
export function useVoidYieldDistribution(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ distributionId, reason }: { distributionId: string; reason: string }) =>
      voidYieldDistribution(distributionId, reason),
    onSuccess: () => {
      toast.success("Yield distribution voided successfully");
      invalidateAfterYieldOp(queryClient);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to void distribution");
    },
  });
}
