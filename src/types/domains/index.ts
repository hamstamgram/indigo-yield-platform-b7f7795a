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

// Approval domain (2-person rule)
export * from "./approval";

// Database enums
export * from "./enums";
// Common Utility Types
// ============================================================================

export type AsyncResult<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type SortOrder = "asc" | "desc";

export interface SortConfig {
  field: string;
  order: SortOrder;
}

export interface FilterConfig {
  [key: string]: string | number | boolean | null | undefined;
}

// ============================================================================
// Status Types
// ============================================================================

export type EntityStatus = "active" | "inactive" | "pending" | "closed" | "suspended";

// ============================================================================
// ID Reference Types
// ============================================================================

export interface IdRef {
  id: string;
}

export interface NamedRef extends IdRef {
  name: string;
}

export interface EmailRef extends NamedRef {
  email: string;
}

// ============================================================================
// API Response Types (from phase3Types)
// ============================================================================

export interface APIResponse<T> {
  data: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

// ============================================================================
// Error Types (from phase3Types)
// ============================================================================

export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  user_id?: string;
  url?: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  tags?: Record<string, string>;
}

// ============================================================================
// Theme Types (from phase3Types)
// ============================================================================

export type ThemeMode = "system" | "light" | "dark";

export interface ThemePreference {
  mode: ThemeMode;
  user_id: string;
  updated_at: string;
}

// ============================================================================
// i18n Types (from phase3Types)
// ============================================================================

export interface I18nConfig {
  locale: string;
  fallback_locale: string;
  available_locales: string[];
}

export interface TranslationKeys {
  [key: string]: string | TranslationKeys;
}
