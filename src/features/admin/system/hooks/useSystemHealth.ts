/**
 * System Health Hooks
 * React Query hooks for system health monitoring
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  getSystemHealth,
  getOverallStatus,
  type SystemHealth,
  type ServiceStatus,
} from "@/features/admin/system/services/systemHealthService";

/**
 * Hook to fetch system health status
 */
export function useSystemHealth() {
  return useQuery<SystemHealth[]>({
    queryKey: QUERY_KEYS.systemHealth,
    queryFn: getSystemHealth,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

/**
 * Hook to get overall system status derived from health data
 */
export function useOverallSystemStatus() {
  const { data: health, ...rest } = useSystemHealth();
  const overallStatus = health ? getOverallStatus(health) : "operational";

  return {
    ...rest,
    data: health,
    overallStatus,
  };
}

// Re-export types
export type { SystemHealth, ServiceStatus };
