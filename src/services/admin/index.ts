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
// Re-export QuickTransactionParams as CreateTransactionParams for backwards compatibility
export type { CreateTransactionParams } from "./adminTransactionService";

// Yield management
export * from "./yieldDistributionService";
export * from "./recordedYieldsService";

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

// Investor lifecycle management
export * from "./investorLifecycleService";

// Investor performance management
export * from "./investorPerformanceService";

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
