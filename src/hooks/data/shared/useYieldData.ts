/**
 * Yield Data Hooks
 * Abstracts yield/AUM operations from components
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getYieldRecords,
  getYieldDetails,
  canVoidYieldRecord,
} from "@/services/admin";
import { canEditYields } from "@/services/admin";
import type {
  YieldRecord,
  YieldFilters,
} from "@/services/admin/recordedYieldsService";
import type { YieldDetails } from "@/services/admin/yields/yieldManagementService";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to fetch yield records with filters
 */
export function useYieldRecords(filters: YieldFilters = {}) {
  return useQuery<YieldRecord[], Error>({
    queryKey: QUERY_KEYS.recordedYields(filters as Record<string, unknown>),
    queryFn: () => getYieldRecords(filters),
  });
}

/**
 * Hook to fetch a single yield record's details
 */
export function useYieldDetails(recordId: string) {
  return useQuery<YieldDetails | null, Error>({
    queryKey: QUERY_KEYS.yieldDetails(recordId),
    queryFn: () => getYieldDetails(recordId),
    enabled: !!recordId,
  });
}

/**
 * Hook to check if current user can edit yields
 */
export function useCanEditYields() {
  return useQuery<boolean, Error>({
    queryKey: QUERY_KEYS.canEditYields,
    queryFn: canEditYields,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check if a specific yield record can be voided
 */
export function useCanVoidYield(recordId: string) {
  return useQuery<{ canVoid: boolean; reason?: string }, Error>({
    queryKey: QUERY_KEYS.canVoidYield(recordId),
    queryFn: () => canVoidYieldRecord(recordId),
    enabled: !!recordId,
  });
}

// Re-export types for convenience
export type { YieldRecord, YieldFilters, YieldDetails };
