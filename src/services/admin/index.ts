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
} from "./adminStatsService";

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
} from "./dashboardMetricsService";

export { fetchFundsWithAUM, fetchRecentActivities, fetchPendingItems } from "./dashboardService";

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
  updateFundStatus,
  createFundSimple,
  fundService,
  type DailyNav,
  type FundKPI,
  type CreateFundInput,
} from "./fundService";

// =============================================================================
// INVESTOR MANAGEMENT
// =============================================================================
export {
  adminInvestorService,
  type AdminInvestorSummary,
  type DashboardStats,
} from "./adminService";
export * from "./investorSettingsService";
export * from "./investorWizardService";
export * from "./investorLifecycleService";
export {
  updateFundPerformance,
  type PerformanceUpdateData as AdminPerformanceUpdateData,
} from "./investorPerformanceService";
export {
  investorDetailService,
  type InvestorDetailData,
  type OpsIndicators,
  type InvestorPositionsData,
  type InvestorPosition as AdminInvestorPosition,
} from "./investorDetailService";

// =============================================================================
// USER MANAGEMENT
// =============================================================================
export {
  deleteInvestorUser,
  forceDeleteInvestorUser,
  createOrFindInvestorUser,
} from "./userService";
export {
  adminUsersService,
  type AdminUserProfile,
  type AdminInviteParams,
} from "./adminUsersService";
export { adminInviteService, type AdminInvite } from "./adminInviteService";

// =============================================================================
// YIELD MANAGEMENT
// =============================================================================
export * from "./yieldDistributionService";
export * from "./recordedYieldsService";
export * from "./yieldManagementService";
export {
  crystallizeYieldBeforeFlow,
  finalizeMonthYield,
  getYieldEventsForFund,
  getYieldEventsForInvestor,
  getAggregatedYieldForPeriod,
  getPendingYieldEventsCount,
  crystallizeMonthEnd,
  getInvestorCrystallizationEvents,
  type CrystallizationResult,
  type InvestorCrystallizationEvent,
  type FinalizationResult,
  type YieldEvent,
  type YieldSnapshot,
} from "./yieldCrystallizationService";

export {
  preflowAumService,
  type ExistingPreflowAum,
  type EnsurePreflowAumResult,
  type AumPurpose,
} from "./preflowAumService";
export * from "./depositWithYieldService";

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
  type BypassAttempt,
  type BatchCrystallizeResult,
  type MergeDuplicatesResult,
} from "./integrityOperationsService";
export { requestsQueueService } from "./requestsQueueService";
export * from "./systemAdminService";
export * from "./emailTrackingService";

export { commandPaletteService, type InvestorSearchResult } from "./commandPaletteService";

// =============================================================================
// ADMIN TOOLS & UTILITIES
// =============================================================================
export { adminToolsService, type ToolResult } from "./adminToolsService";
export { feeScheduleService, type FeeScheduleRow, type FeeHistoryRow } from "./feeScheduleService";
