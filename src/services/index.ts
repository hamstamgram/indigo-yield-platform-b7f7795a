/**
 * Services - Unified barrel export for all service modules
 * 
 * Import services by domain:
 * import { adminServiceV2 } from '@/services/admin';
 * import { depositService } from '@/services/investor';
 * import { operationsService } from '@/services/operations';
 * import { auditLogService } from '@/services/shared';
 * 
 * Or import everything from here:
 * import { adminServiceV2, depositService } from '@/services';
 */

// Investor services (primary for investor data)
export * from "./investor";

// Admin services (excluding expert investor stuff which is now in investor)
export { adminServiceV2 } from "./admin";
export type { InvestorSummaryV2, DashboardStatsV2 } from "./admin";
export { adminTransactionService } from "./admin";
export type { CreateTransactionParams } from "./admin";
export * from "./admin/fundService";
export * from "./admin/yieldDistributionService";
export * from "./admin/recordedYieldsService";
export * from "./admin/bulkOperationsService";
export { 
  deleteInvestorUser, 
  forceDeleteInvestorUser,
  createOrFindInvestorUser 
} from "./admin/userService";

// Operations services (selective to avoid conflicts)
export { operationsService } from "./operations";
export type { OperationsMetrics, PendingBreakdown } from "./operations";
export { positionService } from "./operations";

// Shared services
export * from "./shared";

// Core services
export * from "./core";

// API services (keep existing structure)
export * from "./api/reportsApi";
export * from "./api/statementsApi";

// Fund view service (investor-focused operations, moved to investor/)
export { 
  getAllFunds, 
  getFundById, 
  addFundToInvestor, 
  getInvestorPositions, 
  updateInvestorPosition,
  getAvailableFundsForInvestor,
  removeFundFromInvestor,
  getFundPerformanceSummary,
  getActiveFundsForList,
  getActiveInvestorPositions
} from "./investor/fundViewService";
export type { InvestorPosition } from "./investor/fundViewService";
