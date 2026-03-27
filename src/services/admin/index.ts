/**
 * Admin Services - Barrel Export
 *
 * Consolidated exports for all admin-related services.
 * Organized by domain for better navigation.
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

export { actionBarService, type PendingCounts } from "./actionBarService";

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
} from "./adminService";
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
} from "./adminUsersService";
export {
  adminInviteService,
  type AdminInvite,
} from "@/features/admin/investors/services/adminInviteService";

// =============================================================================
// YIELD MANAGEMENT
// =============================================================================
export * from "./yields";
export {
  getYieldRecords,
  canEditYields,
  getInvestorVisibleAUM,
  getLastFinalizedAUMDate,
  type YieldRecord,
  type YieldFilters,
} from "./recordedYieldsService";
// =============================================================================
// TRANSACTIONS
// =============================================================================
export * from "./transactionDetailsService";
export {
  transactionFormDataService,
  type TransactionFormInvestor,
  type TransactionFormFund,
  type BalanceCheckResult,
} from "./transactionFormDataService";
export {
  internalRouteService,
  type InvestorPositionForRoute,
  type InternalRouteParams,
  type InternalRouteResult,
} from "./internalRouteService";
export { adminTransactionHistoryService } from "./adminTransactionHistoryService";

// =============================================================================
// REPORTS & STATEMENTS
// =============================================================================
export * from "./reportQueryService";
export * from "./statementAdminService";
export { reportService, type SendReportParams } from "./reportService";
export { reportRecipientsService } from "./reportRecipientsService";

// =============================================================================
// IB MANAGEMENT
// =============================================================================
export { ibUsersService, type IBUser } from "./ibUsersService";

// =============================================================================
// SYSTEM & INTEGRITY
// =============================================================================
export { deliveryService } from "./deliveryService";
export { integrityService } from "./integrityService";
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
} from "./integrityOperationsService";
export { requestsQueueService } from "./requestsQueueService";
export * from "./systemAdminService";
export * from "./emailTrackingService";

export { commandPaletteService, type InvestorSearchResult } from "./commandPaletteService";

// =============================================================================
// REPORT SCHEDULES
// =============================================================================
export {
  getReportSchedules,
  createReportSchedule,
  updateReportSchedule,
  deleteReportSchedule,
} from "./reportScheduleService";

// =============================================================================
// ADMIN TOOLS & UTILITIES
// =============================================================================
export { feeScheduleService, type FeeScheduleRow, type FeeHistoryRow } from "./feeScheduleService";
export { feeSettingsService } from "./feeSettingsService";
