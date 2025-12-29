/**
 * Admin Services - Re-exports all admin-related services
 */

// Fund management
export * from "./fundService";

// Admin operations
export { adminServiceV2 } from "./adminService";
export type { InvestorSummaryV2, DashboardStatsV2 } from "./adminService";

// Transaction management
export { adminTransactionService } from "./adminTransactionService";
export type { CreateTransactionParams } from "./adminTransactionService";

// Yield management
export * from "./yieldDistributionService";
export * from "./recordedYieldsService";

// Expert investor views - NOW in investor service
// Re-export for backward compatibility but consumers should use @/services/investor
export { 
  expertInvestorService,
  getAllInvestorsExpertSummary,
  getInvestorExpertView,
  updatePositionValue,
  type ExpertPosition,
  type ExpertInvestor,
} from "@/services/investor";

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
