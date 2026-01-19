/**
 * useAuditLogs - React Query hook for audit log viewer
 * Fetches logs, entities, actions, and summary stats in parallel
 */

import { useQuery } from "@tanstack/react-query";
import { auditLogService, type AuditLogFilters, type AuditLogEntry } from "@/services/shared";
import { getTodayString } from "@/utils/dateUtils";

export interface AuditLogStats {
  totalEntries: number;
  actionCounts: Record<string, number>;
  entityCounts: Record<string, number>;
  topActors: Array<{ user_id: string; name: string; count: number }>;
}

export interface AuditLogsData {
  logs: AuditLogEntry[];
  totalCount: number;
  entities: string[];
  actions: string[];
  stats: AuditLogStats;
}

const DEFAULT_STATS: AuditLogStats = {
  totalEntries: 0,
  actionCounts: {},
  entityCounts: {},
  topActors: [],
};

/**
 * Fetch audit logs with filters, entities, actions, and summary stats
 */
export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery<AuditLogsData>({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const [logsResult, entitiesData, actionsData, summaryData] = await Promise.all([
        auditLogService.fetchAuditLogs(filters),
        auditLogService.getUniqueEntities(),
        auditLogService.getUniqueActions(),
        auditLogService.getAuditLogSummary({
          startDate: filters.startDate,
          endDate: filters.endDate,
        }),
      ]);

      return {
        logs: logsResult.data,
        totalCount: logsResult.count,
        entities: entitiesData,
        actions: actionsData,
        stats: summaryData || DEFAULT_STATS,
      };
    },
    staleTime: 30 * 1000, // 30 seconds - audit logs should stay relatively fresh
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new
  });
}

/**
 * Export logs to CSV - utility function (not a hook)
 */
export async function exportAuditLogsToCSV(filters: AuditLogFilters): Promise<number> {
  const { data } = await auditLogService.fetchAuditLogs({
    ...filters,
    limit: 10000, // Max export limit
    offset: 0,
  });

  if (data.length === 0) {
    throw new Error("No audit logs to export");
  }

  // Build CSV content
  const headers = ["Timestamp", "Actor", "Actor Email", "Action", "Entity", "Entity ID", "Changes", "Metadata"];
  const rows = data.map((log) => [
    new Date(log.created_at).toISOString(),
    log.actor_name || "System",
    log.actor_email || "",
    log.action,
    log.entity,
    log.entity_id || "",
    auditLogService.formatChanges(log.old_values, log.new_values).replace(/,/g, ";"),
    log.meta ? JSON.stringify(log.meta).replace(/,/g, ";") : "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  // Download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-logs-${getTodayString()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return data.length;
}
