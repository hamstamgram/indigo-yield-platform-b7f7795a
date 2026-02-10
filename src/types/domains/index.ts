/**
 * Domain Types - Central Export
 * CANONICAL SOURCE for all domain-specific type abstractions
 *
 * Usage:
 * import { Investor, Transaction, Fund } from "@/types/domains";
 */

// ============================================================================
// Core Domain Types - Import from here!
// ============================================================================

// Investor domain
export * from "./investor";

// Transaction domain
export * from "./transaction";

// Portfolio domain
export * from "./portfolio";

// Fund domain
export * from "./fund";

// Report domain
export * from "./report";

// Document domain
export * from "./document";

// Delivery domain
export * from "./delivery";

// Integrity domain
export * from "./integrity";

// Requests domain
export * from "./requests";

// Yield domain
export * from "./yield";

// Yield distribution record (DB types)
export * from "./yieldDistributionRecord";

// Deposit domain
export * from "./deposit";

// Withdrawal domain (excluding WithdrawalStatus which is in requests)
export {
  type WithdrawalFullStatus,
  type Withdrawal,
  type WithdrawalFilters,
  type PendingByAsset,
  type WithdrawalStats,
  type PaginatedWithdrawals,
  type WithdrawalAuditAction,
  type WithdrawalAuditLog,
  type InvestorOption,
  type WithdrawalInvestorPosition,
  type CreateWithdrawalParams,
  type UpdateWithdrawalParams,
  type DeleteWithdrawalParams,
  type RouteToFeesParams,
} from "./withdrawal";

// Notification domain
export * from "./notification";

// Dashboard domain
export * from "./dashboard";

// Investment domain
export * from "./investment";

// Session domain
export * from "./session";

// Adjustment domain
export * from "./adjustment";

// Fee Allocation domain
export * from "./feeAllocation";

// IB Allocation domain
export * from "./ibAllocation";

// Yield Crystallization domain
export * from "./yieldCrystallization";

// Relations domain (PostgREST join shapes)
export * from "./relations";

// Staging domain (transaction import staging)
export * from "./staging";

// Database enums
export * from "./enums";
