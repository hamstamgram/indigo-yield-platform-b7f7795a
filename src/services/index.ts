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

// Admin services
export * from "./admin";

// Investor services
export * from "./investor";

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

// Fund service (selective export to avoid conflicts with admin/fundService)
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
} from "./fundService";
export type { InvestorPosition } from "./fundService";
