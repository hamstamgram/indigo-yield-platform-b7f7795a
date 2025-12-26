/**
 * Yield Data Hooks
 * Abstracts yield/AUM operations from components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getYieldRecords,
  updateYieldRecord,
  canEditYields,
  YieldRecord,
  YieldFilters,
  UpdateYieldRecordInput,
} from "@/services/admin/recordedYieldsService";
import {
  voidYieldRecord,
  getYieldDetails,
  canVoidYieldRecord,
  YieldDetails,
} from "@/services/admin/yieldManagementService";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/context";

/**
 * Hook to fetch yield records with filters
 */
export function useYieldRecords(filters: YieldFilters = {}) {
  return useQuery<YieldRecord[], Error>({
    queryKey: ["yield-records", filters],
    queryFn: () => getYieldRecords(filters),
  });
}

/**
 * Hook to fetch a single yield record's details
 */
export function useYieldDetails(recordId: string) {
  return useQuery<YieldDetails | null, Error>({
    queryKey: ["yield-details", recordId],
    queryFn: () => getYieldDetails(recordId),
    enabled: !!recordId,
  });
}

/**
 * Hook to check if current user can edit yields
 */
export function useCanEditYields() {
  return useQuery<boolean, Error>({
    queryKey: ["can-edit-yields"],
    queryFn: canEditYields,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check if a specific yield record can be voided
 */
export function useCanVoidYield(recordId: string) {
  return useQuery<{ canVoid: boolean; reason?: string }, Error>({
    queryKey: ["can-void-yield", recordId],
    queryFn: () => canVoidYieldRecord(recordId),
    enabled: !!recordId,
  });
}

/**
 * Hook to update a yield record
 */
export function useUpdateYieldRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      recordId,
      updates,
      reason,
    }: {
      recordId: string;
      updates: UpdateYieldRecordInput;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      return updateYieldRecord(recordId, updates, user.id, reason);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["yield-records"] });
      queryClient.invalidateQueries({ queryKey: ["yield-details", variables.recordId] });
      toast.success("Yield record updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update yield record: ${error.message}`);
    },
  });
}

/**
 * Hook to void a yield record
 */
export function useVoidYieldRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, reason }: { recordId: string; reason: string }) => {
      return voidYieldRecord(recordId, reason);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["yield-records"] });
      queryClient.invalidateQueries({ queryKey: ["yield-details", variables.recordId] });
      toast.success("Yield record voided successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to void yield record: ${error.message}`);
    },
  });
}

// Re-export types for convenience
export type { YieldRecord, YieldFilters, UpdateYieldRecordInput, YieldDetails };
