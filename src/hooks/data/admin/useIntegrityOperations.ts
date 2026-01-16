/**
 * P1 Integrity Operations Hooks
 * React Query hooks for admin_integrity_runs, crystallization,
 * duplicate profiles, and bypass attempts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { integrityOperationsService } from "@/services/admin";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

// ============================================================================
// Integrity Runs & Alerts
// ============================================================================

/**
 * Fetch recent integrity runs
 */
export function useIntegrityRuns(limit = 20) {
  return useQuery({
    queryKey: QUERY_KEYS.adminIntegrityRuns(limit),
    queryFn: () => integrityOperationsService.fetchIntegrityRuns(limit),
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Fetch admin alerts
 */
export function useAdminAlerts(limit = 20, includeAcknowledged = false) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAlerts(limit, includeAcknowledged),
    queryFn: () => integrityOperationsService.fetchAdminAlerts(limit, includeAcknowledged),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Run integrity check mutation
 */
export function useRunIntegrityCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrityOperationsService.runIntegrityCheck,
    onSuccess: (result) => {
      if (result.status === "pass") {
        toast.success("Integrity check passed - no violations found");
      } else {
        toast.warning(
          `Integrity check found ${result.violation_count} violation(s), ${result.critical_count} critical`
        );
      }
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["integrity"] });
    },
    onError: (error: Error) => {
      logError("useRunIntegrityCheck", error);
      toast.error(error.message || "Failed to run integrity check");
    },
  });
}

/**
 * Acknowledge alert mutation
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, userId }: { alertId: string; userId: string }) =>
      integrityOperationsService.acknowledgeAlert(alertId, userId),
    onSuccess: () => {
      toast.success("Alert acknowledged");
      queryClient.invalidateQueries({ queryKey: ["integrity", "admin-alerts"] });
    },
    onError: (error: Error) => {
      logError("useAcknowledgeAlert", error);
      toast.error(error.message || "Failed to acknowledge alert");
    },
  });
}

// ============================================================================
// Crystallization
// ============================================================================

/**
 * Fetch crystallization dashboard
 */
export function useCrystallizationDashboard(fundId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.crystallizationDashboard(fundId),
    queryFn: () => integrityOperationsService.fetchCrystallizationDashboard(fundId),
    refetchInterval: 60000,
  });
}

/**
 * Fetch crystallization gaps
 */
export function useCrystallizationGaps(fundId?: string, limit = 100) {
  return useQuery({
    queryKey: QUERY_KEYS.crystallizationGaps(fundId),
    queryFn: () => integrityOperationsService.fetchCrystallizationGaps(fundId, limit),
    refetchInterval: 60000,
  });
}

/**
 * Batch crystallize fund mutation
 */
export function useBatchCrystallizeFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fundId, dryRun = true }: { fundId: string; dryRun?: boolean }) =>
      integrityOperationsService.batchCrystallizeFund(fundId, dryRun),
    onSuccess: (result) => {
      if (result.dry_run) {
        toast.info(
          `Dry run: Would crystallize ${result.positions_crystallized} of ${result.positions_processed} positions`
        );
      } else {
        toast.success(
          `Crystallized ${result.positions_crystallized} of ${result.positions_processed} positions`
        );
        // Invalidate crystallization queries
        queryClient.invalidateQueries({ queryKey: ["crystallization"] });
        queryClient.invalidateQueries({ queryKey: ["integrity"] });
      }
    },
    onError: (error: Error) => {
      logError("useBatchCrystallizeFund", error);
      toast.error(error.message || "Failed to batch crystallize fund");
    },
  });
}

// ============================================================================
// Duplicates
// ============================================================================

/**
 * Fetch duplicate profiles
 */
export function useDuplicateProfiles() {
  return useQuery({
    queryKey: QUERY_KEYS.duplicateProfiles,
    queryFn: integrityOperationsService.fetchDuplicateProfiles,
    refetchInterval: 120000, // Refresh every 2 minutes
  });
}

/**
 * Merge duplicate profiles mutation
 */
export function useMergeDuplicateProfiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      keepProfileId,
      mergeProfileId,
    }: {
      keepProfileId: string;
      mergeProfileId: string;
    }) => integrityOperationsService.mergeDuplicateProfiles(keepProfileId, mergeProfileId),
    onSuccess: (result) => {
      toast.success(
        `Merged profiles: ${result.transactions_moved} transactions moved, ${result.positions_merged} positions merged`
      );
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.duplicateProfiles });
      queryClient.invalidateQueries({ queryKey: ["integrity"] });
      queryClient.invalidateQueries({ queryKey: ["investors"] });
    },
    onError: (error: Error) => {
      logError("useMergeDuplicateProfiles", error);
      toast.error(error.message || "Failed to merge profiles");
    },
  });
}

// ============================================================================
// Bypass Attempts
// ============================================================================

/**
 * Fetch bypass attempts
 */
export function useBypassAttempts(limit = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.bypassAttempts(limit),
    queryFn: () => integrityOperationsService.fetchBypassAttempts(limit),
    refetchInterval: 30000,
  });
}

// ============================================================================
// Ledger Reconciliation
// ============================================================================

/**
 * Fetch ledger reconciliation issues
 */
export function useLedgerReconciliation() {
  return useQuery({
    queryKey: QUERY_KEYS.ledgerReconciliation,
    queryFn: integrityOperationsService.fetchLedgerReconciliation,
    refetchInterval: 60000,
  });
}
