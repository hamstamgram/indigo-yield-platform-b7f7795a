/**
 * Recorded Yields Page Hooks
 * React Query hooks for yield records management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  getYieldRecords,
  getYieldCorrectionHistory,
  voidYieldRecord,
  updateYieldAum,
  type YieldRecord,
  type YieldFilters,
  type CorrectionHistoryItem,
} from "@/services";
import { invalidateAfterYieldOp } from "@/utils/cacheInvalidation";
import { toast } from "sonner";

export type { YieldRecord, YieldFilters, CorrectionHistoryItem };

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
 * Hook to fetch correction history for badge display
 */
export function useYieldCorrectionHistory(fundId?: string) {
  return useQuery<CorrectionHistoryItem[]>({
    queryKey: QUERY_KEYS.yieldCorrections(fundId),
    queryFn: () => getYieldCorrectionHistory(fundId),
  });
}

/**
 * Hook to fetch correction history for a specific record
 */
export function useRecordCorrectionHistory(record: YieldRecord | null) {
  return useQuery<CorrectionHistoryItem[]>({
    queryKey: QUERY_KEYS.yieldCorrectionHistory(
      record?.fund_id,
      record?.aum_date,
      record?.aum_date
    ),
    queryFn: () =>
      record
        ? getYieldCorrectionHistory(record.fund_id, record.aum_date, record.aum_date)
        : Promise.resolve([]),
    enabled: !!record,
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
