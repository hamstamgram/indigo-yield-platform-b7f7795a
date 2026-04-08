/**
 * Integrity Data Hooks
 * React Query hooks for fetching integrity check data
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { integrityService } from "@/features/admin/system/services/integrityService";
import type { IntegrityCheck, AuditEvent, IntegrityStatus } from "@/types/domains/integrity";
import type { InvariantSuiteResult } from "@/features/admin/system/services/integrityService";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

/**
 * Fetches all integrity checks with 60s refetch interval
 */
export function useIntegrityChecks() {
  const query = useQuery({
    queryKey: QUERY_KEYS.integrityDashboard,
    queryFn: integrityService.fetchIntegrityChecks,
    refetchInterval: 60000,
  });

  const overallStatus: IntegrityStatus = query.data
    ? query.data.every((c) => c.status === "ok")
      ? "ok"
      : query.data.some((c) => c.status === "error")
        ? "error"
        : "warning"
    : "ok";

  return {
    checks: query.data,
    overallStatus,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Fetches recent audit events with 30s refetch interval
 */
export function useAuditEvents(limit = 10) {
  const query = useQuery({
    queryKey: QUERY_KEYS.integrityAuditEvents,
    queryFn: () => integrityService.fetchAuditEvents(limit),
    refetchInterval: 30000,
  });

  return {
    events: query.data,
    isLoading: query.isLoading,
  };
}

/**
 * Runs the 16-check invariant suite via RPC.
 * Returns the full result as mutation data so it can be displayed immediately.
 */
export function useInvariantChecks() {
  return useMutation<InvariantSuiteResult>({
    mutationFn: integrityService.runInvariantChecks,
    onSuccess: (result) => {
      if (result.failed === 0) {
        toast.success(`All ${result.total_checks} invariant checks passed`);
      } else {
        toast.warning(`${result.failed} of ${result.total_checks} checks failed`);
      }
    },
    onError: (error: Error) => {
      logError("useInvariantChecks", error);
      toast.error(error.message || "Failed to run invariant checks");
    },
  });
}
