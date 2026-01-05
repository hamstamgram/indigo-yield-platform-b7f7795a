/**
 * Admin Hooks - Barrel Export
 * Centralized exports for all admin-specific data hooks
 */

// useAdminInvites
export { 
  useIsSuperAdmin,
  useAdminInvites, 
  useCreateAdminInvite, 
  useSendAdminInvite,
  useDeleteAdminInvite,
  useCopyInviteLink,
  type AdminInvite,
} from "./useAdminInvites";

// useAdminStats
export { useAdminStats, type AdminStats } from "./useAdminStats";

// useAdminTransactionHistory
export { useAdminActiveFunds, useAdminTransactions } from "./useAdminTransactionHistory";

// useAdminWithdrawals
export { 
  useAdminWithdrawals, 
  useWithdrawalStats,
  useWithdrawalById,
  useWithdrawalAuditLogs,
  useWithdrawalsWithStats,
  type WithdrawalFilters,
  type WithdrawalStats,
  type PaginatedWithdrawals,
  type Withdrawal,
  type WithdrawalAuditLog,
} from "./useAdminWithdrawals";

// useDeliveryData
export { 
  usePeriodsWithCounts, 
  useDeliveryStats, 
  useDeliveries,
} from "./useDeliveryData";

// useDeliveryMutations
export { 
  useDeliveryMutations,
  type SendProgress,
} from "./useDeliveryMutations";

// useEmailTracking
export { 
  useEmailStats, 
  useEmailDeliveries,
  type EmailStats,
  type EmailDelivery,
  type EmailFilters,
} from "./useEmailTracking";

// useFees
export { 
  useFeesOverview,
  useFeeFunds,
  useFeeTransactions,
  useIndigoFeesBalance,
  useFeeAllocations,
  useRoutingAuditEntries,
  useYieldEarned,
  type FeesOverviewData,
  type FeeRecord,
  type Fund as FeeFund,
  type FeeAllocation,
  type RoutingAuditEntry,
  type RoutingSummary,
  type YieldEarned,
  type FeeSummary,
} from "./useFees";

// useIntegrityData
export { 
  useIntegrityChecks, 
  useAuditEvents,
} from "./useIntegrityData";

// useMonthClosure
export { 
  useMonthClosure,
  type MonthClosureStatus,
  type CloseMonthResult,
  type ReopenMonthResult,
} from "./useMonthClosure";

// useMonthlyReports
export { 
  useInvestorMonthlyReports, 
  useCreateMonthlyTemplate, 
  useUpdateMonthlyReportField,
  type MonthlyReport,
} from "./useMonthlyReports";

// useOperationsHub
export { 
  useRecentAuditLogs, 
  useOperationsRealtime,
  type AuditLogEntry,
} from "./useOperationsHub";

// useReportData
export { 
  useHistoricalDataSummary,
  useActiveInvestorsForReports,
  useStatementPeriod,
  useInvestorReportData,
  useGenerateTemplates,
  useSendInvestorReport,
  useReportGenerationData,
} from "./useReportData";

// useRequestsQueueData
export { 
  useWithdrawalRequests, 
  useDepositsQueue,
} from "./useRequestsQueueData";

// useRequestsQueueMutations
export { useRequestsQueueMutations } from "./useRequestsQueueMutations";

// useStatementData
export { 
  useStatementPeriods, 
  useGeneratedStatements,
  useInvestorStatements,
  useDeleteStatement,
  usePeriodStatementCount,
  type GeneratedStatement,
  type StatementPeriod,
  type StatementFilters,
} from "./useStatementData";

// useSystemAdmin
export { 
  useResetHistory,
  usePositionResetPreview,
  useExecutePositionReset,
  useAdminUsers,
  useAdminUsersWithRoles,
  useRemoveAdminRole,
  useUpdateAdminRole,
  useCreateAdminInvite as useCreateSystemAdminInvite,
  useSendAdminInviteEmail,
  useForceResetPassword,
  useDeliveryQueueMetrics,
  useDataIntegrityStatus,
  type ResetLogEntry,
  type PositionResetPreview,
  type PositionResetResult,
  type AdminProfile,
  type AdminUser,
  type DeliveryQueueMetrics,
  type IntegrityData,
  type IntegrityCheck,
} from "./useSystemAdmin";

// useTransactionMutations
export { useTransactionMutations } from "./useTransactionMutations";

// useYieldOperations
export { 
  useActiveFundsWithAUM, 
  useFundInvestorComposition, 
  useApplyYieldDistribution,
  type YieldCalculationInput,
} from "./useYieldOperations";

// useAdminUsers (new - for AdminUsersList component)
export {
  useAdminUsersAll as useAdminUsersList,
  useToggleAdminStatusMutation,
  useSendAdminInviteMutation,
  useSuperAdminCheck,
  type AdminUserProfile,
  type AdminInviteParams,
} from "./useAdminUsers";

// useActionBar (new - for ActionBar component)
export {
  usePendingCounts,
  type PendingCounts,
} from "./useActionBar";

// useCommandPalette (new - for CommandPalette component)
export {
  useCommandPaletteInvestors,
  type InvestorSearchResult as CommandPaletteInvestorResult,
} from "./useCommandPalette";

// useInternalRoute (new - for InternalRouteDialog component)
export {
  useInvestorPositionsForRoute,
  useInternalRouteMutation,
  type InvestorPositionForRoute,
  type InternalRouteParams,
  type InternalRouteResult,
} from "./useInternalRoute";

// useReportRecipients (new - for ReportRecipientsEditor component)
export {
  useReportRecipients,
  useUpdateReportRecipients,
} from "./useReportRecipients";

// useIBUsers (new - for IBStep wizard component)
export {
  useIBUsers,
  type IBUser,
} from "./useIBUsers";

// useDeposits (new - for deposit components)
export {
  useDepositStats,
  useDeposits,
  type DepositStats,
  type DepositFilters,
} from "./useDeposits";

// useAssets (new - for asset components)
export {
  useAssetStats,
  useAssets,
  useAssetPrices,
  useLatestAssetPrice,
  type AssetStats,
  type AssetFilters,
} from "./useAssets";

// useTransactionFormData (new - for AdminManualTransaction page)
export {
  useTransactionFormInvestors,
  useTransactionFormFunds,
  useAumCheck as useTransactionFormAumCheck,
  useInvestorBalanceCheck as useTransactionFormBalanceCheck,
  type TransactionFormInvestor,
  type TransactionFormFund,
  type BalanceCheckResult as TransactionFormBalanceCheckResult,
} from "./useTransactionFormData";

// useInvestorDetail (new - for InvestorManagement page)
export {
  useInvestorDetail,
  useInvestorOpsIndicators,
  useInvestorPositions as useAdminInvestorPositions,
  useInvestorActivePositions,
  type InvestorDetailData,
  type OpsIndicators,
  type InvestorPosition as AdminInvestorPosition,
  type InvestorPositionsData as AdminInvestorPositionsData,
} from "./useInvestorDetail";

// useSystemHealth (new - for SystemHealthPage)
export {
  useSystemHealth,
  useOverallSystemStatus,
  type SystemHealth,
  type ServiceStatus,
} from "./useSystemHealth";

// usePlatformSettings (new - for AdminSettings page)
export {
  usePlatformSettings,
  usePlatformSettingsForm,
  defaultPlatformSettings,
  type PlatformSettings,
} from "./usePlatformSettings";


// useAdminStatementsPage (new - for AdminStatementsPage)
export {
  useActiveInvestorsForStatements as useStatementsPageInvestors,
  useStatementDocuments,
  useGenerateStatement as useGenerateStatementMutation,
  useSendStatementEmail,
} from "./useAdminStatementsPage";

// useRecordedYieldsPage (new - for RecordedYieldsPage)
export {
  useYieldRecords as useRecordedYieldsData,
  useYieldCorrectionHistory,
  useRecordCorrectionHistory,
  useVoidYieldRecord as useVoidYieldMutation,
  useVoidYieldDistribution,
  useUpdateYieldAum,
  type YieldRecord as RecordedYieldRecord,
  type YieldFilters as RecordedYieldFilters,
  type CorrectionHistoryItem,
} from "./useRecordedYieldsPage";

// useAdminInvitesPage (new - for AdminInvitesPage)
export {
  useAdminInvitesList,
  useCreateAdminInvite as useCreateAdminInvitePage,
  useRevokeAdminInvite,
  type AdminInvite as AdminInviteItem,
} from "./useAdminInvitesPage";

// usePendingTransactionDetails (new - for PendingTransactionDetailsPage)
export {
  usePendingTransactionDetails,
  type PendingTransactionDetail,
} from "./usePendingTransactionDetails";

// useIBManagementPage (new - for IBManagementPage)
export {
  useIBProfiles,
  useCreateIB,
  type IBProfile,
  type EarningsByAsset,
} from "./useIBManagementPage";

// useAdminInvestorMutations (moved from hooks/admin/)
export {
  usePendingWithdrawalsCount as useAdminPendingWithdrawalsCount,
  useUpdateInvestorStatus as useAdminUpdateInvestorStatus,
  useCleanupInactiveInvestors,
  useUpdateFundPerformance,
} from "./useAdminInvestorMutations";

// Re-export types from services
export type { InvestorStatus, CleanupResult } from "@/services/admin/investorLifecycleService";
export type { PerformanceUpdateData as AdminPerformanceUpdateData } from "@/services/admin/investorPerformanceService";

// useIBPayoutMutations (moved from hooks/admin/)
export {
  useIBAllocationsForPayout,
  useMarkAllocationsAsPaid,
} from "./useIBPayoutMutations";
