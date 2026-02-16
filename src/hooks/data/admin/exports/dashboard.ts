/**
 * Admin Dashboard Hooks - Re-exports
 * Dashboard metrics and queries used exclusively by admin pages
 */

export {
  useFinancialMetrics,
  useHistoricalFlowData,
  useFundComposition,
  useDeliveryStatus,
  useRetryDelivery,
  useDeliveryDiagnostics,
  useDeliveryExclusionBreakdown,
  type FinancialMetrics,
  type FlowData,
  type InvestorComposition,
  type DeliveryRecord,
  type DeliveryDiagnostics,
  type ExclusionBreakdown,
} from "@/hooks/data/shared/useDashboardMetrics";

export {
  useFundsWithAUM,
  useRecentActivities,
  usePendingItems,
} from "@/hooks/data/shared/useDashboardQueries";
