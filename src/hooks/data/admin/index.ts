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
