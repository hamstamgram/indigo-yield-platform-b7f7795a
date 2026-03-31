/**
 * Operations Metrics Hooks
 * React Query hooks for operations dashboard metrics
 */

import { useQuery } from "@tanstack/react-query";
import { operationsService, type PendingBreakdown } from "../services/operationsService";
import { getSystemHealth, type SystemHealth } from "@/services/core/systemHealthService";
import { QUERY_KEYS } from "@/constants/queryKeys";

export interface OperationsMetricsData {
  pendingApprovals: number;
  todaysTransactions: number;
  activeInvestors: number;
  totalAUM: number;
  transactionTrend: string;
  pendingBreakdown: PendingBreakdown;
}

/**
 * Hook to fetch operations dashboard metrics
 */
export function useOperationsMetrics() {
  return useQuery<OperationsMetricsData>({
    queryKey: QUERY_KEYS.operationsMetrics(),
    queryFn: async () => {
      const [metricsData, yesterdayCount] = await Promise.all([
        operationsService.getMetrics(),
        operationsService.getYesterdayTransactions(),
      ]);

      const trend = operationsService.calculateTrend(
        metricsData.todaysTransactions,
        yesterdayCount
      );

      return {
        pendingApprovals: metricsData.pendingApprovals,
        todaysTransactions: metricsData.todaysTransactions,
        activeInvestors: metricsData.activeInvestors,
        totalAUM: metricsData.totalAUM,
        transactionTrend: trend,
        pendingBreakdown: operationsService.getPendingBreakdown(metricsData),
      };
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Hook to fetch system health status
 */
export function useOperationsSystemHealth() {
  return useQuery<SystemHealth[]>({
    queryKey: QUERY_KEYS.operationsSystemHealth(),
    queryFn: getSystemHealth,
    staleTime: 60_000, // 1 minute
  });
}

// Re-export types
export type { PendingBreakdown };
