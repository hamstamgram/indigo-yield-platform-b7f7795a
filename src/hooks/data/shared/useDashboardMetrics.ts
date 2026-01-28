/**
 * Dashboard Metrics Hooks
 *
 * React Query hooks for admin dashboard metrics and analytics.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { toast } from "sonner";
import {
  getFinancialMetrics,
  getHistoricalFlowData,
  getDeliveryStatus,
  retryDelivery,
  getDeliveryDiagnostics,
  getDeliveryExclusionBreakdown,
} from "@/services/admin";
import type {
  FinancialMetrics,
  FlowData,
  InvestorComposition,
  DeliveryRecord,
  DeliveryDiagnostics,
  ExclusionBreakdown,
} from "@/services/admin/dashboardMetricsService";
// getFundInvestorComposition imported directly due to naming conflict
import { getFundInvestorComposition } from "@/services/admin/dashboardMetricsService";

// ============================================================================
// Performance Dashboard Hooks
// ============================================================================

/**
 * Hook for fetching financial metrics (AUM history + flows)
 */
export function useFinancialMetrics() {
  return useQuery<FinancialMetrics>({
    queryKey: QUERY_KEYS.financialMetrics,
    queryFn: getFinancialMetrics,
    staleTime: 60000, // 1 minute
  });
}

// ============================================================================
// Financial Snapshot Hooks
// ============================================================================

/**
 * Hook for fetching historical flow data for a specific date
 */
export function useHistoricalFlowData(targetDate: Date | undefined) {
  return useQuery<Map<string, FlowData>>({
    queryKey: QUERY_KEYS.historicalFlowData(targetDate?.toISOString()),
    queryFn: () => getHistoricalFlowData(targetDate!),
    enabled: !!targetDate,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook for fetching investor composition for a fund
 */
export function useFundComposition(fundId: string | null) {
  return useQuery<InvestorComposition[]>({
    queryKey: QUERY_KEYS.fundComposition(fundId || undefined),
    queryFn: () => getFundInvestorComposition(fundId!),
    enabled: !!fundId,
    staleTime: 30000,
  });
}

// ============================================================================
// Delivery Status Hooks
// ============================================================================

/**
 * Hook for fetching delivery status records
 */
export function useDeliveryStatus(statementId: string, investorId?: string, periodId?: string) {
  return useQuery<DeliveryRecord[]>({
    queryKey: QUERY_KEYS.statementDeliveryStatus(statementId, investorId, periodId),
    queryFn: () => getDeliveryStatus(statementId, investorId, periodId),
    enabled: !!(statementId || (investorId && periodId)),
  });
}

/**
 * Hook for retrying a failed delivery
 */
export function useRetryDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: retryDelivery,
    onSuccess: () => {
      toast.success("Delivery re-queued for retry");
      // Invalidate delivery-related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statementDelivery });
    },
    onError: (error: Error) => {
      toast.error(`Failed to retry: ${error.message}`);
    },
  });
}

// ============================================================================
// Delivery Diagnostics Hooks
// ============================================================================

/**
 * Hook for fetching delivery diagnostics for a period
 */
export function useDeliveryDiagnostics(periodId: string) {
  return useQuery<DeliveryDiagnostics>({
    queryKey: QUERY_KEYS.deliveryDiagnostics(periodId),
    queryFn: () => getDeliveryDiagnostics(periodId),
    enabled: !!periodId,
    staleTime: 30000,
  });
}

// ============================================================================
// Delivery Exclusion Stats Hooks
// ============================================================================

/**
 * Hook for fetching delivery exclusion breakdown for a period
 */
export function useDeliveryExclusionBreakdown(periodId: string) {
  return useQuery<ExclusionBreakdown>({
    queryKey: QUERY_KEYS.deliveryExclusionBreakdown(periodId),
    queryFn: () => getDeliveryExclusionBreakdown(periodId),
    enabled: !!periodId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// ============================================================================
// Re-export Types
// ============================================================================

export type {
  FinancialMetrics,
  FlowData,
  InvestorComposition,
  DeliveryRecord,
  DeliveryDiagnostics,
  ExclusionBreakdown,
};
