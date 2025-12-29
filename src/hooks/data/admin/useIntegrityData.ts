/**
 * Integrity Data Hooks
 * React Query hooks for fetching integrity check data
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { integrityService } from "@/services/admin/integrityService";
import type { IntegrityCheck, AuditEvent, IntegrityStatus } from "@/types/domains/integrity";

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
