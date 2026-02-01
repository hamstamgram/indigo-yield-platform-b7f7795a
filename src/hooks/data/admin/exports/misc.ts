/**
 * Miscellaneous admin hooks (IB, email, audit, reports, etc.)
 */

// useAdminStats
export { useAdminStats, type AdminStats } from "../useAdminStats";

// useDeliveryData
export { usePeriodsWithCounts, useDeliveryStats, useDeliveries } from "../useDeliveryData";

// useDeliveryMutations
export { useDeliveryMutations, type SendProgress } from "../useDeliveryMutations";

// useEmailTracking
export {
  useEmailStats,
  useEmailDeliveries,
  type EmailStats,
  type EmailDelivery,
  type EmailFilters,
} from "../useEmailTracking";

// useIntegrityData
export { useIntegrityChecks, useAuditEvents, useInvariantChecks } from "../useIntegrityData";

// useIntegrityOperations (P1)
export {
  useIntegrityRuns,
  useAdminAlerts,
  useRunIntegrityCheck,
  useAcknowledgeAlert,
} from "../useIntegrityOperations";

// useMonthlyReports
export {
  useInvestorMonthlyReports,
  useCreateMonthlyTemplate,
  useUpdateMonthlyReportField,
  type MonthlyReport,
} from "../useMonthlyReports";

// useOperationsHub
export { useRecentAuditLogs, useOperationsRealtime, type AuditLogEntry } from "../useOperationsHub";

// useReportData
export {
  useHistoricalDataSummary,
  useActiveInvestorsForReports,
  useStatementPeriod,
  useInvestorReportData,
  useGenerateTemplates,
  useSendInvestorReport,
  useReportGenerationData,
} from "../useReportData";

// useActionBar
export { usePendingCounts, type PendingCounts } from "../useActionBar";

// useCommandPalette
export {
  useCommandPaletteInvestors,
  type InvestorSearchResult as CommandPaletteInvestorResult,
} from "../useCommandPalette";

// useInternalRoute
export {
  useInvestorPositionsForRoute,
  useInternalRouteMutation,
  type InvestorPositionForRoute,
  type InternalRouteParams,
  type InternalRouteResult,
} from "../useInternalRoute";

// useReportRecipients
export { useReportRecipients, useUpdateReportRecipients } from "../useReportRecipients";

// useIBUsers
export { useIBUsers, type IBUser } from "../useIBUsers";

// useDeposits
export {
  useDepositStats,
  useDeposits,
  type DepositStats,
  type DepositFilters,
} from "../useDeposits";

// useAssets
export {
  useAssetStats,
  useAssets,
  useAssetPrices,
  useLatestAssetPrice,
  type AssetStats,
  type AssetFilters,
} from "../useAssets";

// useIBManagementPage
export {
  useIBProfiles,
  useCreateIB,
  type IBProfile,
  type EarningsByAsset,
} from "../useIBManagementPage";

// useIBPayoutMutations
export { useIBAllocationsForPayout, useMarkAllocationsAsPaid } from "../useIBPayoutMutations";

// useAuditLogs
export {
  useAuditLogs,
  exportAuditLogsToCSV,
  type AuditLogsData,
  type AuditLogStats,
} from "../useAuditLogs";

// useRealtimeAlerts
export { useRealtimeAlerts, useUnacknowledgedAlertCount } from "../useRealtimeAlerts";
