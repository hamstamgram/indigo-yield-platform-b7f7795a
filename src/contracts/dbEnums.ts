/**
 * Database Enum Contracts
 * AUTO-GENERATED - DO NOT EDIT
 *
 * Regenerate with: npm run contracts:generate
 */

import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// =============================================================================
// ACCESS_EVENT ENUM
// =============================================================================

export const ACCESS_EVENT_VALUES = [
  "login",
  "logout",
  "2fa_setup",
  "2fa_verify",
  "session_revoked",
  "password_change",
] as const;

export const AccessEventSchema = z.enum(ACCESS_EVENT_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid access_event: "${ctx.data}". Valid: ${ACCESS_EVENT_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type AccessEvent = z.infer<typeof AccessEventSchema>;

export const DB_ACCESS_EVENT = {
  login: "login",
  logout: "logout",
  "2fa_setup": "2fa_setup",
  "2fa_verify": "2fa_verify",
  session_revoked: "session_revoked",
  password_change: "password_change",
} as const satisfies Record<string, AccessEvent>;

export function isValidAccessEvent(value: string): value is AccessEvent {
  return AccessEventSchema.safeParse(value).success;
}

// =============================================================================
// ACCOUNT_TYPE ENUM
// =============================================================================

export const ACCOUNT_TYPE_VALUES = ["investor", "ib", "fees_account"] as const;

export const AccountTypeSchema = z.enum(ACCOUNT_TYPE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid account_type: "${ctx.data}". Valid: ${ACCOUNT_TYPE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type AccountType = z.infer<typeof AccountTypeSchema>;

export const DB_ACCOUNT_TYPE = {
  investor: "investor",
  ib: "ib",
  fees_account: "fees_account",
} as const satisfies Record<string, AccountType>;

export function isValidAccountType(value: string): value is AccountType {
  return AccountTypeSchema.safeParse(value).success;
}

// =============================================================================
// APP_ROLE ENUM
// =============================================================================

export const APP_ROLE_VALUES = [
  "super_admin",
  "admin",
  "moderator",
  "ib",
  "user",
  "investor",
] as const;

export const AppRoleSchema = z.enum(APP_ROLE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return { message: `Invalid app_role: "${ctx.data}". Valid: ${APP_ROLE_VALUES.join(", ")}` };
    }
    return { message: ctx.defaultError };
  },
});

export type AppRole = z.infer<typeof AppRoleSchema>;

export const DB_APP_ROLE = {
  super_admin: "super_admin",
  admin: "admin",
  moderator: "moderator",
  ib: "ib",
  user: "user",
  investor: "investor",
} as const satisfies Record<string, AppRole>;

export function isValidAppRole(value: string): value is AppRole {
  return AppRoleSchema.safeParse(value).success;
}

// =============================================================================
// APPROVAL_OPERATION_TYPE ENUM
// =============================================================================

export const APPROVAL_OPERATION_TYPE_VALUES = [
  "PERIOD_LOCK",
  "PERIOD_UNLOCK",
  "LARGE_WITHDRAWAL",
  "LARGE_DEPOSIT",
  "STAGING_PROMOTION",
  "FEE_STRUCTURE_CHANGE",
  "RECONCILIATION_FINALIZE",
  "VOID_TRANSACTION",
  "BULK_OPERATION",
  "MFA_RESET",
] as const;

export const ApprovalOperationTypeSchema = z.enum(APPROVAL_OPERATION_TYPE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid approval_operation_type: "${ctx.data}". Valid: ${APPROVAL_OPERATION_TYPE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type ApprovalOperationType = z.infer<typeof ApprovalOperationTypeSchema>;

export const DB_APPROVAL_OPERATION_TYPE = {
  PERIOD_LOCK: "PERIOD_LOCK",
  PERIOD_UNLOCK: "PERIOD_UNLOCK",
  LARGE_WITHDRAWAL: "LARGE_WITHDRAWAL",
  LARGE_DEPOSIT: "LARGE_DEPOSIT",
  STAGING_PROMOTION: "STAGING_PROMOTION",
  FEE_STRUCTURE_CHANGE: "FEE_STRUCTURE_CHANGE",
  RECONCILIATION_FINALIZE: "RECONCILIATION_FINALIZE",
  VOID_TRANSACTION: "VOID_TRANSACTION",
  BULK_OPERATION: "BULK_OPERATION",
  MFA_RESET: "MFA_RESET",
} as const satisfies Record<string, ApprovalOperationType>;

export function isValidApprovalOperationType(value: string): value is ApprovalOperationType {
  return ApprovalOperationTypeSchema.safeParse(value).success;
}

// =============================================================================
// ASSET_CODE ENUM
// =============================================================================

export const ASSET_CODE_VALUES = [
  "BTC",
  "ETH",
  "SOL",
  "USDT",
  "EURC",
  "xAUT",
  "XRP",
  "ADA",
] as const;

export const AssetCodeSchema = z.enum(ASSET_CODE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid asset_code: "${ctx.data}". Valid: ${ASSET_CODE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type AssetCode = z.infer<typeof AssetCodeSchema>;

export const DB_ASSET_CODE = {
  BTC: "BTC",
  ETH: "ETH",
  SOL: "SOL",
  USDT: "USDT",
  EURC: "EURC",
  xAUT: "xAUT",
  XRP: "XRP",
  ADA: "ADA",
} as const satisfies Record<string, AssetCode>;

export function isValidAssetCode(value: string): value is AssetCode {
  return AssetCodeSchema.safeParse(value).success;
}

// =============================================================================
// AUM_PURPOSE ENUM
// =============================================================================

export const AUM_PURPOSE_VALUES = ["reporting", "transaction"] as const;

export const AumPurposeSchema = z.enum(AUM_PURPOSE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid aum_purpose: "${ctx.data}". Valid: ${AUM_PURPOSE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type AumPurpose = z.infer<typeof AumPurposeSchema>;

export const DB_AUM_PURPOSE = {
  reporting: "reporting",
  transaction: "transaction",
} as const satisfies Record<string, AumPurpose>;

export function isValidAumPurpose(value: string): value is AumPurpose {
  return AumPurposeSchema.safeParse(value).success;
}

// =============================================================================
// BENCHMARK_TYPE ENUM
// =============================================================================

export const BENCHMARK_TYPE_VALUES = ["BTC", "ETH", "STABLE", "CUSTOM"] as const;

export const BenchmarkTypeSchema = z.enum(BENCHMARK_TYPE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid benchmark_type: "${ctx.data}". Valid: ${BENCHMARK_TYPE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type BenchmarkType = z.infer<typeof BenchmarkTypeSchema>;

export const DB_BENCHMARK_TYPE = {
  BTC: "BTC",
  ETH: "ETH",
  STABLE: "STABLE",
  CUSTOM: "CUSTOM",
} as const satisfies Record<string, BenchmarkType>;

export function isValidBenchmarkType(value: string): value is BenchmarkType {
  return BenchmarkTypeSchema.safeParse(value).success;
}

// =============================================================================
// DOCUMENT_TYPE ENUM
// =============================================================================

export const DOCUMENT_TYPE_VALUES = ["statement", "notice", "terms", "tax", "other"] as const;

export const DocumentTypeSchema = z.enum(DOCUMENT_TYPE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid document_type: "${ctx.data}". Valid: ${DOCUMENT_TYPE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const DB_DOCUMENT_TYPE = {
  statement: "statement",
  notice: "notice",
  terms: "terms",
  tax: "tax",
  other: "other",
} as const satisfies Record<string, DocumentType>;

export function isValidDocumentType(value: string): value is DocumentType {
  return DocumentTypeSchema.safeParse(value).success;
}

// =============================================================================
// ERROR_CATEGORY ENUM
// =============================================================================

export const ERROR_CATEGORY_VALUES = [
  "VALIDATION",
  "BUSINESS_RULE",
  "STATE",
  "PERMISSION",
  "NOT_FOUND",
  "CONFLICT",
  "SYSTEM",
] as const;

export const ErrorCategorySchema = z.enum(ERROR_CATEGORY_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid error_category: "${ctx.data}". Valid: ${ERROR_CATEGORY_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;

export const DB_ERROR_CATEGORY = {
  VALIDATION: "VALIDATION",
  BUSINESS_RULE: "BUSINESS_RULE",
  STATE: "STATE",
  PERMISSION: "PERMISSION",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  SYSTEM: "SYSTEM",
} as const satisfies Record<string, ErrorCategory>;

export function isValidErrorCategory(value: string): value is ErrorCategory {
  return ErrorCategorySchema.safeParse(value).success;
}

// =============================================================================
// FEE_KIND ENUM
// =============================================================================

export const FEE_KIND_VALUES = ["mgmt", "perf"] as const;

export const FeeKindSchema = z.enum(FEE_KIND_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return { message: `Invalid fee_kind: "${ctx.data}". Valid: ${FEE_KIND_VALUES.join(", ")}` };
    }
    return { message: ctx.defaultError };
  },
});

export type FeeKind = z.infer<typeof FeeKindSchema>;

export const DB_FEE_KIND = {
  mgmt: "mgmt",
  perf: "perf",
} as const satisfies Record<string, FeeKind>;

export function isValidFeeKind(value: string): value is FeeKind {
  return FeeKindSchema.safeParse(value).success;
}

// =============================================================================
// FUND_STATUS ENUM
// =============================================================================

export const FUND_STATUS_VALUES = [
  "active",
  "inactive",
  "suspended",
  "deprecated",
  "pending",
] as const;

export const FundStatusSchema = z.enum(FUND_STATUS_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid fund_status: "${ctx.data}". Valid: ${FUND_STATUS_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type FundStatus = z.infer<typeof FundStatusSchema>;

export const DB_FUND_STATUS = {
  active: "active",
  inactive: "inactive",
  suspended: "suspended",
  deprecated: "deprecated",
  pending: "pending",
} as const satisfies Record<string, FundStatus>;

export function isValidFundStatus(value: string): value is FundStatus {
  return FundStatusSchema.safeParse(value).success;
}

// =============================================================================
// NOTIFICATION_PRIORITY ENUM
// =============================================================================

export const NOTIFICATION_PRIORITY_VALUES = ["low", "medium", "high"] as const;

export const NotificationPrioritySchema = z.enum(NOTIFICATION_PRIORITY_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid notification_priority: "${ctx.data}". Valid: ${NOTIFICATION_PRIORITY_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

export const DB_NOTIFICATION_PRIORITY = {
  low: "low",
  medium: "medium",
  high: "high",
} as const satisfies Record<string, NotificationPriority>;

export function isValidNotificationPriority(value: string): value is NotificationPriority {
  return NotificationPrioritySchema.safeParse(value).success;
}

// =============================================================================
// NOTIFICATION_TYPE ENUM
// =============================================================================

export const NOTIFICATION_TYPE_VALUES = [
  "deposit",
  "statement",
  "performance",
  "system",
  "support",
  "withdrawal",
  "yield",
] as const;

export const NotificationTypeSchema = z.enum(NOTIFICATION_TYPE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid notification_type: "${ctx.data}". Valid: ${NOTIFICATION_TYPE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const DB_NOTIFICATION_TYPE = {
  deposit: "deposit",
  statement: "statement",
  performance: "performance",
  system: "system",
  support: "support",
  withdrawal: "withdrawal",
  yield: "yield",
} as const satisfies Record<string, NotificationType>;

export function isValidNotificationType(value: string): value is NotificationType {
  return NotificationTypeSchema.safeParse(value).success;
}

// =============================================================================
// PLATFORM_ERROR_CODE ENUM
// =============================================================================

export const PLATFORM_ERROR_CODE_VALUES = [
  "PREFLOW_AUM_MISSING",
  "AUM_NOT_FOUND",
  "AUM_ALREADY_EXISTS",
  "AUM_DUPLICATE_PREFLOW",
  "PERIOD_LOCKED",
  "PERIOD_NOT_FOUND",
  "ECONOMIC_DATE_REQUIRED",
  "FUTURE_DATE_NOT_ALLOWED",
  "BACKDATED_NOT_ALLOWED",
  "LEDGER_IMMUTABLE",
  "TRANSACTION_NOT_FOUND",
  "TRANSACTION_ALREADY_VOIDED",
  "INSUFFICIENT_BALANCE",
  "INVALID_TRANSACTION_TYPE",
  "ASSET_MISMATCH",
  "INVALID_ASSET",
  "YIELD_CONSERVATION_VIOLATION",
  "DUST_TOLERANCE_EXCEEDED",
  "NO_POSITIONS_FOR_YIELD",
  "FUND_NOT_FOUND",
  "FUND_INACTIVE",
  "INVESTOR_NOT_FOUND",
  "INVESTOR_POSITION_NOT_FOUND",
  "INVESTOR_NOT_IN_FUND",
  "APPROVAL_REQUIRED",
  "APPROVAL_PENDING",
  "SELF_APPROVAL_NOT_ALLOWED",
  "UNAUTHORIZED",
  "ADMIN_REQUIRED",
  "VALIDATION_ERROR",
  "REQUIRED_FIELD_MISSING",
  "INVALID_AMOUNT",
  "INVALID_DATE",
  "INVALID_PURPOSE",
  "SYSTEM_ERROR",
  "INVARIANT_VIOLATION",
  "CONCURRENCY_ERROR",
  "STAGING_VALIDATION_FAILED",
  "STAGING_BATCH_NOT_FOUND",
  "STAGING_ALREADY_PROMOTED",
] as const;

export const PlatformErrorCodeSchema = z.enum(PLATFORM_ERROR_CODE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid platform_error_code: "${ctx.data}". Valid: ${PLATFORM_ERROR_CODE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type PlatformErrorCode = z.infer<typeof PlatformErrorCodeSchema>;

export const DB_PLATFORM_ERROR_CODE = {
  PREFLOW_AUM_MISSING: "PREFLOW_AUM_MISSING",
  AUM_NOT_FOUND: "AUM_NOT_FOUND",
  AUM_ALREADY_EXISTS: "AUM_ALREADY_EXISTS",
  AUM_DUPLICATE_PREFLOW: "AUM_DUPLICATE_PREFLOW",
  PERIOD_LOCKED: "PERIOD_LOCKED",
  PERIOD_NOT_FOUND: "PERIOD_NOT_FOUND",
  ECONOMIC_DATE_REQUIRED: "ECONOMIC_DATE_REQUIRED",
  FUTURE_DATE_NOT_ALLOWED: "FUTURE_DATE_NOT_ALLOWED",
  BACKDATED_NOT_ALLOWED: "BACKDATED_NOT_ALLOWED",
  LEDGER_IMMUTABLE: "LEDGER_IMMUTABLE",
  TRANSACTION_NOT_FOUND: "TRANSACTION_NOT_FOUND",
  TRANSACTION_ALREADY_VOIDED: "TRANSACTION_ALREADY_VOIDED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVALID_TRANSACTION_TYPE: "INVALID_TRANSACTION_TYPE",
  ASSET_MISMATCH: "ASSET_MISMATCH",
  INVALID_ASSET: "INVALID_ASSET",
  YIELD_CONSERVATION_VIOLATION: "YIELD_CONSERVATION_VIOLATION",
  DUST_TOLERANCE_EXCEEDED: "DUST_TOLERANCE_EXCEEDED",
  NO_POSITIONS_FOR_YIELD: "NO_POSITIONS_FOR_YIELD",
  FUND_NOT_FOUND: "FUND_NOT_FOUND",
  FUND_INACTIVE: "FUND_INACTIVE",
  INVESTOR_NOT_FOUND: "INVESTOR_NOT_FOUND",
  INVESTOR_POSITION_NOT_FOUND: "INVESTOR_POSITION_NOT_FOUND",
  INVESTOR_NOT_IN_FUND: "INVESTOR_NOT_IN_FUND",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  APPROVAL_PENDING: "APPROVAL_PENDING",
  SELF_APPROVAL_NOT_ALLOWED: "SELF_APPROVAL_NOT_ALLOWED",
  UNAUTHORIZED: "UNAUTHORIZED",
  ADMIN_REQUIRED: "ADMIN_REQUIRED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  REQUIRED_FIELD_MISSING: "REQUIRED_FIELD_MISSING",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  INVALID_DATE: "INVALID_DATE",
  INVALID_PURPOSE: "INVALID_PURPOSE",
  SYSTEM_ERROR: "SYSTEM_ERROR",
  INVARIANT_VIOLATION: "INVARIANT_VIOLATION",
  CONCURRENCY_ERROR: "CONCURRENCY_ERROR",
  STAGING_VALIDATION_FAILED: "STAGING_VALIDATION_FAILED",
  STAGING_BATCH_NOT_FOUND: "STAGING_BATCH_NOT_FOUND",
  STAGING_ALREADY_PROMOTED: "STAGING_ALREADY_PROMOTED",
} as const satisfies Record<string, PlatformErrorCode>;

export function isValidPlatformErrorCode(value: string): value is PlatformErrorCode {
  return PlatformErrorCodeSchema.safeParse(value).success;
}

// =============================================================================
// SHARE_SCOPE ENUM
// =============================================================================

export const SHARE_SCOPE_VALUES = ["portfolio", "documents", "statement"] as const;

export const ShareScopeSchema = z.enum(SHARE_SCOPE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid share_scope: "${ctx.data}". Valid: ${SHARE_SCOPE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type ShareScope = z.infer<typeof ShareScopeSchema>;

export const DB_SHARE_SCOPE = {
  portfolio: "portfolio",
  documents: "documents",
  statement: "statement",
} as const satisfies Record<string, ShareScope>;

export function isValidShareScope(value: string): value is ShareScope {
  return ShareScopeSchema.safeParse(value).success;
}

// =============================================================================
// TICKET_CATEGORY ENUM
// =============================================================================

export const TICKET_CATEGORY_VALUES = [
  "account",
  "portfolio",
  "statement",
  "technical",
  "general",
] as const;

export const TicketCategorySchema = z.enum(TICKET_CATEGORY_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid ticket_category: "${ctx.data}". Valid: ${TICKET_CATEGORY_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type TicketCategory = z.infer<typeof TicketCategorySchema>;

export const DB_TICKET_CATEGORY = {
  account: "account",
  portfolio: "portfolio",
  statement: "statement",
  technical: "technical",
  general: "general",
} as const satisfies Record<string, TicketCategory>;

export function isValidTicketCategory(value: string): value is TicketCategory {
  return TicketCategorySchema.safeParse(value).success;
}

// =============================================================================
// TICKET_PRIORITY ENUM
// =============================================================================

export const TICKET_PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;

export const TicketPrioritySchema = z.enum(TICKET_PRIORITY_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid ticket_priority: "${ctx.data}". Valid: ${TICKET_PRIORITY_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const DB_TICKET_PRIORITY = {
  low: "low",
  medium: "medium",
  high: "high",
  urgent: "urgent",
} as const satisfies Record<string, TicketPriority>;

export function isValidTicketPriority(value: string): value is TicketPriority {
  return TicketPrioritySchema.safeParse(value).success;
}

// =============================================================================
// TICKET_STATUS ENUM
// =============================================================================

export const TICKET_STATUS_VALUES = ["open", "in_progress", "waiting_on_lp", "closed"] as const;

export const TicketStatusSchema = z.enum(TICKET_STATUS_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid ticket_status: "${ctx.data}". Valid: ${TICKET_STATUS_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const DB_TICKET_STATUS = {
  open: "open",
  in_progress: "in_progress",
  waiting_on_lp: "waiting_on_lp",
  closed: "closed",
} as const satisfies Record<string, TicketStatus>;

export function isValidTicketStatus(value: string): value is TicketStatus {
  return TicketStatusSchema.safeParse(value).success;
}

// =============================================================================
// TRANSACTION_STATUS ENUM
// =============================================================================

export const TRANSACTION_STATUS_VALUES = ["pending", "confirmed", "failed", "cancelled"] as const;

export const TransactionStatusSchema = z.enum(TRANSACTION_STATUS_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid transaction_status: "${ctx.data}". Valid: ${TRANSACTION_STATUS_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export const DB_TRANSACTION_STATUS = {
  pending: "pending",
  confirmed: "confirmed",
  failed: "failed",
  cancelled: "cancelled",
} as const satisfies Record<string, TransactionStatus>;

export function isValidTransactionStatus(value: string): value is TransactionStatus {
  return TransactionStatusSchema.safeParse(value).success;
}

// =============================================================================
// TRANSACTION_TYPE ENUM
// =============================================================================

export const TRANSACTION_TYPE_VALUES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "INTEREST",
  "FEE",
  "DUST_ALLOCATION",
] as const;

export const TransactionTypeSchema = z.enum(TRANSACTION_TYPE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid transaction_type: "${ctx.data}". Valid: ${TRANSACTION_TYPE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const DB_TRANSACTION_TYPE = {
  DEPOSIT: "DEPOSIT",
  WITHDRAWAL: "WITHDRAWAL",
  INTEREST: "INTEREST",
  FEE: "FEE",
  DUST_ALLOCATION: "DUST_ALLOCATION",
} as const satisfies Record<string, TransactionType>;

export function isValidTransactionType(value: string): value is TransactionType {
  return TransactionTypeSchema.safeParse(value).success;
}

// =============================================================================
// TX_SOURCE ENUM
// =============================================================================

export const TX_SOURCE_VALUES = [
  "manual_admin",
  "yield_distribution",
  "fee_allocation",
  "ib_allocation",
  "system_bootstrap",
  "investor_wizard",
  "internal_routing",
  "yield_correction",
  "withdrawal_completion",
  "rpc_canonical",
  "crystallization",
  "system",
  "migration",
  "stress_test",
] as const;

export const TxSourceSchema = z.enum(TX_SOURCE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return { message: `Invalid tx_source: "${ctx.data}". Valid: ${TX_SOURCE_VALUES.join(", ")}` };
    }
    return { message: ctx.defaultError };
  },
});

export type TxSource = z.infer<typeof TxSourceSchema>;

export const DB_TX_SOURCE = {
  manual_admin: "manual_admin",
  yield_distribution: "yield_distribution",
  fee_allocation: "fee_allocation",
  ib_allocation: "ib_allocation",
  system_bootstrap: "system_bootstrap",
  investor_wizard: "investor_wizard",
  internal_routing: "internal_routing",
  yield_correction: "yield_correction",
  withdrawal_completion: "withdrawal_completion",
  rpc_canonical: "rpc_canonical",
  crystallization: "crystallization",
  system: "system",
  migration: "migration",
  stress_test: "stress_test",
} as const satisfies Record<string, TxSource>;

export function isValidTxSource(value: string): value is TxSource {
  return TxSourceSchema.safeParse(value).success;
}

// =============================================================================
// TX_TYPE ENUM
// =============================================================================

export const TX_TYPE_VALUES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "INTEREST",
  "FEE",
  "ADJUSTMENT",
  "FEE_CREDIT",
  "IB_CREDIT",
  "YIELD",
  "INTERNAL_WITHDRAWAL",
  "INTERNAL_CREDIT",
  "IB_DEBIT",
  "DUST_SWEEP",
] as const;

export const TxTypeSchema = z.enum(TX_TYPE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      if (ctx.data === "FIRST_INVESTMENT") {
        return {
          message: `Invalid tx_type: FIRST_INVESTMENT is UI-only. Use mapUITypeToDb() to convert to DEPOSIT.`,
        };
      }
      return { message: `Invalid tx_type: "${ctx.data}". Valid: ${TX_TYPE_VALUES.join(", ")}` };
    }
    return { message: ctx.defaultError };
  },
});

export type TxType = z.infer<typeof TxTypeSchema>;

export const DB_TX_TYPE = {
  DEPOSIT: "DEPOSIT",
  WITHDRAWAL: "WITHDRAWAL",
  INTEREST: "INTEREST",
  FEE: "FEE",
  ADJUSTMENT: "ADJUSTMENT",
  FEE_CREDIT: "FEE_CREDIT",
  IB_CREDIT: "IB_CREDIT",
  YIELD: "YIELD",
  INTERNAL_WITHDRAWAL: "INTERNAL_WITHDRAWAL",
  INTERNAL_CREDIT: "INTERNAL_CREDIT",
  IB_DEBIT: "IB_DEBIT",
  DUST_SWEEP: "DUST_SWEEP",
} as const satisfies Record<string, TxType>;

export function isValidTxType(value: string): value is TxType {
  return TxTypeSchema.safeParse(value).success;
}

// =============================================================================
// VISIBILITY_SCOPE ENUM
// =============================================================================

export const VISIBILITY_SCOPE_VALUES = ["investor_visible", "admin_only"] as const;

export const VisibilityScopeSchema = z.enum(VISIBILITY_SCOPE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid visibility_scope: "${ctx.data}". Valid: ${VISIBILITY_SCOPE_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type VisibilityScope = z.infer<typeof VisibilityScopeSchema>;

export const DB_VISIBILITY_SCOPE = {
  investor_visible: "investor_visible",
  admin_only: "admin_only",
} as const satisfies Record<string, VisibilityScope>;

export function isValidVisibilityScope(value: string): value is VisibilityScope {
  return VisibilityScopeSchema.safeParse(value).success;
}

// =============================================================================
// WITHDRAWAL_ACTION ENUM
// =============================================================================

export const WITHDRAWAL_ACTION_VALUES = [
  "create",
  "approve",
  "reject",
  "processing",
  "complete",
  "cancel",
  "update",
  "route_to_fees",
] as const;

export const WithdrawalActionSchema = z.enum(WITHDRAWAL_ACTION_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid withdrawal_action: "${ctx.data}". Valid: ${WITHDRAWAL_ACTION_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type WithdrawalAction = z.infer<typeof WithdrawalActionSchema>;

export const DB_WITHDRAWAL_ACTION = {
  create: "create",
  approve: "approve",
  reject: "reject",
  processing: "processing",
  complete: "complete",
  cancel: "cancel",
  update: "update",
  route_to_fees: "route_to_fees",
} as const satisfies Record<string, WithdrawalAction>;

export function isValidWithdrawalAction(value: string): value is WithdrawalAction {
  return WithdrawalActionSchema.safeParse(value).success;
}

// =============================================================================
// WITHDRAWAL_STATUS ENUM
// =============================================================================

export const WITHDRAWAL_STATUS_VALUES = [
  "pending",
  "approved",
  "processing",
  "completed",
  "rejected",
  "cancelled",
] as const;

export const WithdrawalStatusSchema = z.enum(WITHDRAWAL_STATUS_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid withdrawal_status: "${ctx.data}". Valid: ${WITHDRAWAL_STATUS_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type WithdrawalStatus = z.infer<typeof WithdrawalStatusSchema>;

export const DB_WITHDRAWAL_STATUS = {
  pending: "pending",
  approved: "approved",
  processing: "processing",
  completed: "completed",
  rejected: "rejected",
  cancelled: "cancelled",
} as const satisfies Record<string, WithdrawalStatus>;

export function isValidWithdrawalStatus(value: string): value is WithdrawalStatus {
  return WithdrawalStatusSchema.safeParse(value).success;
}

// =============================================================================
// YIELD_DISTRIBUTION_STATUS ENUM
// =============================================================================

export const YIELD_DISTRIBUTION_STATUS_VALUES = [
  "draft",
  "applied",
  "voided",
  "previewed",
  "corrected",
  "rolled_back",
] as const;

export const YieldDistributionStatusSchema = z.enum(YIELD_DISTRIBUTION_STATUS_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      return {
        message: `Invalid yield_distribution_status: "${ctx.data}". Valid: ${YIELD_DISTRIBUTION_STATUS_VALUES.join(", ")}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export type YieldDistributionStatus = z.infer<typeof YieldDistributionStatusSchema>;

export const DB_YIELD_DISTRIBUTION_STATUS = {
  draft: "draft",
  applied: "applied",
  voided: "voided",
  previewed: "previewed",
  corrected: "corrected",
  rolled_back: "rolled_back",
} as const satisfies Record<string, YieldDistributionStatus>;

export function isValidYieldDistributionStatus(value: string): value is YieldDistributionStatus {
  return YieldDistributionStatusSchema.safeParse(value).success;
}

// =============================================================================
// UI EXTENSIONS
// =============================================================================

/** UI-only transaction types that get mapped to DB types */
export const UI_TX_TYPE_VALUES = [...TX_TYPE_VALUES, "FIRST_INVESTMENT"] as const;
export const UITxTypeSchema = z.enum(UI_TX_TYPE_VALUES);
export type UITxType = z.infer<typeof UITxTypeSchema>;

/** Map UI transaction type to DB type */
export function mapUITypeToDb(uiType: UITxType): TxType {
  if (uiType === "FIRST_INVESTMENT") return "DEPOSIT";
  return TxTypeSchema.parse(uiType);
}

export function safeMapUITypeToDb(uiType: string): TxType | null {
  const result = UITxTypeSchema.safeParse(uiType);
  if (!result.success) return null;
  return mapUITypeToDb(result.data);
}

export function getDefaultSubtype(uiType: UITxType): string {
  switch (uiType) {
    case "FIRST_INVESTMENT":
      return "first_investment";
    case "DEPOSIT":
      return "top_up";
    case "WITHDRAWAL":
      return "redemption";
    case "FEE":
      return "fee_charge";
    case "YIELD":
    case "INTEREST":
      return "yield_credit";
    default:
      return "adjustment";
  }
}

/** Check if value is a valid UI transaction type */
export function isValidUITxType(value: unknown): value is UITxType {
  return UITxTypeSchema.safeParse(value).success;
}

export function assertValidTxType(type: string, context?: string): asserts type is TxType {
  if (type === "FIRST_INVESTMENT") {
    throw new Error(
      `FIRST_INVESTMENT must be mapped to DEPOSIT${context ? ` (in ${context})` : ""}`
    );
  }
  if (!isValidTxType(type)) {
    throw new Error(`Invalid transaction type: ${type}${context ? ` (in ${context})` : ""}`);
  }
}

// =============================================================================
// TYPE ALIGNMENT VERIFICATION
// =============================================================================
// These compile-time checks ensure our contracts match Supabase types

type SupabaseAccessEvent = Database["public"]["Enums"]["access_event"];
const _access_eventCheck: AccessEvent extends SupabaseAccessEvent
  ? SupabaseAccessEvent extends AccessEvent
    ? true
    : false
  : false = true;
void _access_eventCheck;
type SupabaseAccountType = Database["public"]["Enums"]["account_type"];
const _account_typeCheck: AccountType extends SupabaseAccountType
  ? SupabaseAccountType extends AccountType
    ? true
    : false
  : false = true;
void _account_typeCheck;
type SupabaseAppRole = Database["public"]["Enums"]["app_role"];
const _app_roleCheck: AppRole extends SupabaseAppRole
  ? SupabaseAppRole extends AppRole
    ? true
    : false
  : false = true;
void _app_roleCheck;
type SupabaseApprovalOperationType = Database["public"]["Enums"]["approval_operation_type"];
const _approval_operation_typeCheck: ApprovalOperationType extends SupabaseApprovalOperationType
  ? SupabaseApprovalOperationType extends ApprovalOperationType
    ? true
    : false
  : false = true;
void _approval_operation_typeCheck;
type SupabaseAssetCode = Database["public"]["Enums"]["asset_code"];
const _asset_codeCheck: AssetCode extends SupabaseAssetCode
  ? SupabaseAssetCode extends AssetCode
    ? true
    : false
  : false = true;
void _asset_codeCheck;
type SupabaseAumPurpose = Database["public"]["Enums"]["aum_purpose"];
const _aum_purposeCheck: AumPurpose extends SupabaseAumPurpose
  ? SupabaseAumPurpose extends AumPurpose
    ? true
    : false
  : false = true;
void _aum_purposeCheck;
type SupabaseBenchmarkType = Database["public"]["Enums"]["benchmark_type"];
const _benchmark_typeCheck: BenchmarkType extends SupabaseBenchmarkType
  ? SupabaseBenchmarkType extends BenchmarkType
    ? true
    : false
  : false = true;
void _benchmark_typeCheck;
type SupabaseDocumentType = Database["public"]["Enums"]["document_type"];
const _document_typeCheck: DocumentType extends SupabaseDocumentType
  ? SupabaseDocumentType extends DocumentType
    ? true
    : false
  : false = true;
void _document_typeCheck;
type SupabaseErrorCategory = Database["public"]["Enums"]["error_category"];
const _error_categoryCheck: ErrorCategory extends SupabaseErrorCategory
  ? SupabaseErrorCategory extends ErrorCategory
    ? true
    : false
  : false = true;
void _error_categoryCheck;
type SupabaseFeeKind = Database["public"]["Enums"]["fee_kind"];
const _fee_kindCheck: FeeKind extends SupabaseFeeKind
  ? SupabaseFeeKind extends FeeKind
    ? true
    : false
  : false = true;
void _fee_kindCheck;
type SupabaseFundStatus = Database["public"]["Enums"]["fund_status"];
const _fund_statusCheck: FundStatus extends SupabaseFundStatus
  ? SupabaseFundStatus extends FundStatus
    ? true
    : false
  : false = true;
void _fund_statusCheck;
type SupabaseNotificationPriority = Database["public"]["Enums"]["notification_priority"];
const _notification_priorityCheck: NotificationPriority extends SupabaseNotificationPriority
  ? SupabaseNotificationPriority extends NotificationPriority
    ? true
    : false
  : false = true;
void _notification_priorityCheck;
type SupabaseNotificationType = Database["public"]["Enums"]["notification_type"];
const _notification_typeCheck: NotificationType extends SupabaseNotificationType
  ? SupabaseNotificationType extends NotificationType
    ? true
    : false
  : false = true;
void _notification_typeCheck;
type SupabasePlatformErrorCode = Database["public"]["Enums"]["platform_error_code"];
const _platform_error_codeCheck: PlatformErrorCode extends SupabasePlatformErrorCode
  ? SupabasePlatformErrorCode extends PlatformErrorCode
    ? true
    : false
  : false = true;
void _platform_error_codeCheck;
type SupabaseShareScope = Database["public"]["Enums"]["share_scope"];
const _share_scopeCheck: ShareScope extends SupabaseShareScope
  ? SupabaseShareScope extends ShareScope
    ? true
    : false
  : false = true;
void _share_scopeCheck;
type SupabaseTicketCategory = Database["public"]["Enums"]["ticket_category"];
const _ticket_categoryCheck: TicketCategory extends SupabaseTicketCategory
  ? SupabaseTicketCategory extends TicketCategory
    ? true
    : false
  : false = true;
void _ticket_categoryCheck;
type SupabaseTicketPriority = Database["public"]["Enums"]["ticket_priority"];
const _ticket_priorityCheck: TicketPriority extends SupabaseTicketPriority
  ? SupabaseTicketPriority extends TicketPriority
    ? true
    : false
  : false = true;
void _ticket_priorityCheck;
type SupabaseTicketStatus = Database["public"]["Enums"]["ticket_status"];
const _ticket_statusCheck: TicketStatus extends SupabaseTicketStatus
  ? SupabaseTicketStatus extends TicketStatus
    ? true
    : false
  : false = true;
void _ticket_statusCheck;
type SupabaseTransactionStatus = Database["public"]["Enums"]["transaction_status"];
const _transaction_statusCheck: TransactionStatus extends SupabaseTransactionStatus
  ? SupabaseTransactionStatus extends TransactionStatus
    ? true
    : false
  : false = true;
void _transaction_statusCheck;
type SupabaseTransactionType = Database["public"]["Enums"]["transaction_type"];
const _transaction_typeCheck: TransactionType extends SupabaseTransactionType
  ? SupabaseTransactionType extends TransactionType
    ? true
    : false
  : false = true;
void _transaction_typeCheck;
type SupabaseTxSource = Database["public"]["Enums"]["tx_source"];
const _tx_sourceCheck: TxSource extends SupabaseTxSource
  ? SupabaseTxSource extends TxSource
    ? true
    : false
  : false = true;
void _tx_sourceCheck;
type SupabaseTxType = Database["public"]["Enums"]["tx_type"];
const _tx_typeCheck: TxType extends SupabaseTxType
  ? SupabaseTxType extends TxType
    ? true
    : false
  : false = true;
void _tx_typeCheck;
type SupabaseVisibilityScope = Database["public"]["Enums"]["visibility_scope"];
const _visibility_scopeCheck: VisibilityScope extends SupabaseVisibilityScope
  ? SupabaseVisibilityScope extends VisibilityScope
    ? true
    : false
  : false = true;
void _visibility_scopeCheck;
type SupabaseWithdrawalAction = Database["public"]["Enums"]["withdrawal_action"];
const _withdrawal_actionCheck: WithdrawalAction extends SupabaseWithdrawalAction
  ? SupabaseWithdrawalAction extends WithdrawalAction
    ? true
    : false
  : false = true;
void _withdrawal_actionCheck;
type SupabaseWithdrawalStatus = Database["public"]["Enums"]["withdrawal_status"];
const _withdrawal_statusCheck: WithdrawalStatus extends SupabaseWithdrawalStatus
  ? SupabaseWithdrawalStatus extends WithdrawalStatus
    ? true
    : false
  : false = true;
void _withdrawal_statusCheck;
type SupabaseYieldDistributionStatus = Database["public"]["Enums"]["yield_distribution_status"];
const _yield_distribution_statusCheck: YieldDistributionStatus extends SupabaseYieldDistributionStatus
  ? SupabaseYieldDistributionStatus extends YieldDistributionStatus
    ? true
    : false
  : false = true;
void _yield_distribution_statusCheck;
