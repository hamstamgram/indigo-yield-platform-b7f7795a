/**
 * Admin Services - Re-exports all admin-related services
 */

// Fund management
export * from "./fundService";

// Admin operations
export { adminServiceV2 } from "./adminService";
export type { InvestorSummaryV2, DashboardStatsV2 } from "./adminService";

// Transaction management
// NOTE: adminTransactionService is deprecated - use transactionService from @/services/shared
export { adminTransactionService } from "./adminTransactionService";
// Note: CreateTransactionParams type is exported from @/services/shared/transactionService

// Yield management
export * from "./yieldDistributionService";
export * from "./recordedYieldsService";
export * from "./yieldManagementService";

// Bulk operations
export * from "./bulkOperationsService";

// User management
export { 
  deleteInvestorUser, 
  forceDeleteInvestorUser,
  createOrFindInvestorUser 
} from "./userService";

// Delivery management
export { deliveryService } from "./deliveryService";

// Integrity management
export { integrityService } from "./integrityService";

// Requests queue management
export { requestsQueueService } from "./requestsQueueService";

// Transaction history management
export { adminTransactionHistoryService } from "./adminTransactionHistoryService";

// Dashboard widgets
export {
  fetchFundsWithAUM,
  fetchRecentActivities,
  fetchPendingItems,
} from "./dashboardService";

// Dashboard metrics (selective to avoid conflicts)
export {
  getFinancialMetrics,
  getHistoricalFlowData,
  // getFundInvestorComposition excluded - conflicts with yieldDistributionService
  getDeliveryStatus,
  retryDelivery,
  getDeliveryDiagnostics,
  getDeliveryExclusionBreakdown,
} from "./dashboardMetricsService";
export type {
  FinancialMetrics,
  FlowData,
  InvestorComposition,
  DeliveryRecord,
  DeliveryDiagnostics,
  ExclusionBreakdown,
} from "./dashboardMetricsService";

// Operations hub (selective to avoid AuditLogEntry conflict)
export {
  getRecentAuditLogs,
  setupOperationsRealtimeChannel,
  removeOperationsChannel,
} from "./operationsHubService";
export type { AuditLogEntry as OperationsAuditLogEntry } from "./operationsHubService";

// System admin
export * from "./systemAdminService";

// Email tracking
export * from "./emailTrackingService";

// Transaction details
export * from "./transactionDetailsService";

// Investor settings
export * from "./investorSettingsService";

// Investor wizard
export * from "./investorWizardService";

// Investor lifecycle management
export * from "./investorLifecycleService";

// Investor performance management
// Note: PerformanceUpdateData renamed to avoid conflict with shared/performanceDataService
export { updateFundPerformance } from "./investorPerformanceService";
export type { PerformanceUpdateData as AdminPerformanceUpdateData } from "./investorPerformanceService";

// IB payout management
export * from "./ibPayoutService";

// Report query service
export * from "./reportQueryService";

// Statement admin service
export * from "./statementAdminService";

// Admin users service (new)
export { adminUsersService, type AdminUserProfile, type AdminInviteParams } from "./adminUsersService";

// Action bar service (new)
export { actionBarService, type PendingCounts } from "./actionBarService";

// Command palette service (new)
export { commandPaletteService, type InvestorSearchResult } from "./commandPaletteService";

// Internal route service (new)
export { internalRouteService, type InvestorPositionForRoute, type InternalRouteParams, type InternalRouteResult } from "./internalRouteService";

// Report recipients service (new)
export { reportRecipientsService } from "./reportRecipientsService";

// IB users service (new)
export { ibUsersService, type IBUser } from "./ibUsersService";

// Transaction form data service (new)
export { transactionFormDataService, type TransactionFormInvestor, type TransactionFormFund, type BalanceCheckResult } from "./transactionFormDataService";

// Investor detail service (new)
export { investorDetailService, type InvestorDetailData, type OpsIndicators } from "./investorDetailService";
