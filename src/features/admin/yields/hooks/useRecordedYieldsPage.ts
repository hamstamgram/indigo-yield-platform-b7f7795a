/**
 * Recorded Yields Page Hooks
 * React Query hooks for yield records management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  getYieldRecords,
  voidYieldRecord,
  voidYieldDistribution,
  updateYieldAum,
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
 * Hook to void a yield record
 */
export function useVoidYieldRecord(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, reason }: { recordId: string; reason: string }) =>
      voidYieldRecord(recordId, reason),
    onSuccess: () => {
      toast.success("Yield record voided successfully");
      invalidateAfterYieldOp(queryClient);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to void record");
    },
  });
}

/**
 * Hook to update yield AUM
 */
export function useUpdateYieldAum(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recordId,
      newAum,
      reason,
    }: {
      recordId: string;
      newAum: number;
      reason: string;
    }) => updateYieldAum(recordId, newAum, reason),
    onSuccess: () => {
      toast.success("Yield AUM updated successfully");
      invalidateAfterYieldOp(queryClient);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update AUM");
    },
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
