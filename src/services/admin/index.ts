/**
 * Admin Services - Barrel Export (Canonical Redirect Shim)
 *
 * This file serves as a re-export shim to maintain backward compatibility
 * during the migration to feature-based architecture.
 *
 * ALL active logic has been moved to src/features/admin/*/services/
 */

// =============================================================================
// DASHBOARD & STATS
// =============================================================================
export {
  fetchAdminStats,
  getFundCountByStatus,
  getPendingWithdrawalCount,
  getRecentActivityCount,
  type AdminStats,
} from "@/features/admin/dashboard/services/adminStatsService";

export {
  getAUMHistory,
  getFinancialMetrics,
  getHistoricalFlowData,
  getFundInvestorComposition,
  getDeliveryStatus,
  retryDelivery,
  getDeliveryDiagnostics,
  getDeliveryExclusionBreakdown,
  type AUMHistoryPoint,
  type FinancialMetrics,
  type FlowData,
  type InvestorComposition,
  type DeliveryRecord,
  type DeliveryDiagnostics,
  type ExclusionBreakdown,
} from "@/features/admin/dashboard/services/dashboardMetricsService";

export {
  fetchFundsWithAUM,
  fetchRecentActivities,
  fetchPendingItems,
} from "@/features/admin/dashboard/services/dashboardService";

export { actionBarService, type PendingCounts } from "@/features/admin/shared/services/actionBarService";

// =============================================================================
// FUND MANAGEMENT
// =============================================================================
export {
  listFunds,
  getFund,
  createFund,
  updateFund,
  getFundKPIs,
  getLatestNav,
  getFundPerformance,
  checkFundUsage,
  getActiveFunds,
  getFundsByIds,
  getFundByAsset,
  codeExists,
  deactivateFund,
  deleteFund,
  updateFundStatus,
  createFundSimple,
  fundService,
  type DailyNav,
  type FundKPI,
  type CreateFundInput,
} from "@/features/admin/funds/services/fundService";

// =============================================================================
// INVESTOR MANAGEMENT
// =============================================================================
export {
  adminInvestorService,
  type AdminInvestorSummary,
  type DashboardStats,
} from "@/features/admin/investors/services/adminService";
export * from "@/features/admin/investors/services/investorSettingsService";
export * from "@/features/admin/investors/services/investorWizardService";
export * from "@/features/admin/investors/services/investorLifecycleService";
export {
  updateFundPerformance,
  type PerformanceUpdateData as AdminPerformanceUpdateData,
} from "@/features/admin/investors/services/investorPerformanceService";
export {
  investorDetailService,
  type InvestorDetailData,
  type OpsIndicators,
  type InvestorPositionsData,
  type InvestorPosition as AdminInvestorPosition,
} from "@/features/admin/investors/services/investorDetailService";

// =============================================================================
// USER MANAGEMENT
// =============================================================================
export {
  deleteInvestorUser,
  forceDeleteInvestorUser,
  createOrFindInvestorUser,
} from "@/features/admin/investors/services/userService";
export {
  adminUsersService,
  type AdminUserProfile,
  type AdminInviteParams,
} from "@/features/admin/investors/services/adminUsersService";
export {
  adminInviteService,
  type AdminInvite,
} from "@/features/admin/investors/services/adminInviteService";

// =============================================================================
// YIELD MANAGEMENT
// =============================================================================
export * from "@/features/admin/yields/services/yields";
export {
  getYieldRecords,
  canEditYields,
  getInvestorVisibleAUM,
  getLastFinalizedAUMDate,
  type YieldRecord,
  type YieldFilters,
} from "@/features/admin/yields/services/recordedYieldsService";

// =============================================================================
// TRANSACTIONS
// =============================================================================
export * from "@/features/admin/transactions/services/transactionDetailsService";
export {
  transactionFormDataService,
  type TransactionFormInvestor,
  type TransactionFormFund,
  type BalanceCheckResult,
} from "@/features/admin/transactions/services/transactionFormDataService";
export {
  internalRouteService,
  type InvestorPositionForRoute,
  type InternalRouteParams,
  type InternalRouteResult,
} from "@/features/admin/shared/services/internalRouteService";
export { adminTransactionHistoryService } from "@/features/admin/transactions/services/adminTransactionHistoryService";

// =============================================================================
// REPORTS & STATEMENTS
// =============================================================================
export * from "@/features/admin/reports/services/reportQueryService";
export * from "@/features/admin/reports/services/statementAdminService";
export { reportService, type SendReportParams } from "@/features/admin/reports/services/reportService";
export { reportRecipientsService } from "@/features/admin/reports/services/reportRecipientsService";

// =============================================================================
// IB MANAGEMENT
// =============================================================================
export { ibUsersService, type IBUser } from "@/features/admin/ib/services/ibUsersService";

// =============================================================================
// SYSTEM & INTEGRITY
// =============================================================================
export { deliveryService } from "@/features/admin/reports/services/deliveryService";
export { integrityService } from "@/features/admin/system/services/integrityService";
export {
  integrityOperationsService,
  type IntegrityRun,
  type IntegrityViolation,
  type AdminAlert,
  type IntegrityCheckResult,
  type CrystallizationDashboardRow,
  type CrystallizationGap,
  type DuplicateProfile,
  type MergeDuplicatesResult,
} from "@/features/admin/system/services/integrityOperationsService";
export { requestsQueueService } from "@/features/admin/operations/services/requestsQueueService";
export * from "@/features/admin/system/services/systemAdminService";
export * from "@/features/admin/reports/services/emailTrackingService";

export { commandPaletteService, type InvestorSearchResult } from "@/features/admin/shared/services/commandPaletteService";

// =============================================================================
// REPORT SCHEDULES
// =============================================================================
export {
  getReportSchedules,
  createReportSchedule,
  updateReportSchedule,
  deleteReportSchedule,
} from "@/features/admin/reports/services/reportScheduleService";

// =============================================================================
// ADMIN TOOLS & UTILITIES
// =============================================================================
export { feeScheduleService, type FeeScheduleRow, type FeeHistoryRow } from "@/features/admin/investors/services/feeScheduleService";
export { feeSettingsService } from "@/features/admin/investors/services/feeSettingsService";
