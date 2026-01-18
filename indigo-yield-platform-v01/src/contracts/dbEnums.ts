/**
 * DIRECTORY OF DATABASE ENUMS
 * AUTO-GENERATED - DO NOT EDIT DIRECTLY
 * Source: artifacts/schema-truth-pack.json
 */

export const DB_ENUMS = {
  access_event: [
    "login",
    "logout",
    "2fa_setup",
    "2fa_verify",
    "session_revoked",
    "password_change",
  ] as const,
  account_type: ["investor", "ib", "fees_account"] as const,
  app_role: ["super_admin", "admin", "moderator", "ib", "user", "investor"] as const,
  approval_operation_type: [
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
  ] as const,
  asset_code: ["BTC", "ETH", "SOL", "USDT", "EURC", "xAUT", "XRP", "ADA"] as const,
  aum_purpose: ["reporting", "transaction"] as const,
  benchmark_type: ["BTC", "ETH", "STABLE", "CUSTOM"] as const,
  document_type: ["statement", "notice", "terms", "tax", "other"] as const,
  error_category: [
    "VALIDATION",
    "BUSINESS_RULE",
    "STATE",
    "PERMISSION",
    "NOT_FOUND",
    "CONFLICT",
    "SYSTEM",
  ] as const,
  fee_kind: ["mgmt", "perf"] as const,
  fund_status: ["active", "inactive", "suspended", "deprecated", "pending"] as const,
  notification_priority: ["low", "medium", "high"] as const,
  notification_type: [
    "deposit",
    "statement",
    "performance",
    "system",
    "support",
    "withdrawal",
    "yield",
  ] as const,
  platform_error_code: [
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
  ] as const,
  share_scope: ["portfolio", "documents", "statement"] as const,
  ticket_category: ["account", "portfolio", "statement", "technical", "general"] as const,
  ticket_priority: ["low", "medium", "high", "urgent"] as const,
  ticket_status: ["open", "in_progress", "waiting_on_lp", "closed"] as const,
  transaction_status: ["pending", "confirmed", "failed", "cancelled"] as const,
  transaction_type: ["DEPOSIT", "WITHDRAWAL", "INTEREST", "FEE", "DUST_ALLOCATION"] as const,
  tx_source: [
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
  ] as const,
  tx_type: [
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
  ] as const,
  visibility_scope: ["investor_visible", "admin_only"] as const,
  withdrawal_action: [
    "create",
    "approve",
    "reject",
    "processing",
    "complete",
    "cancel",
    "update",
    "route_to_fees",
  ] as const,
  withdrawal_status: [
    "pending",
    "approved",
    "processing",
    "completed",
    "rejected",
    "cancelled",
  ] as const,
  yield_distribution_status: [
    "draft",
    "applied",
    "voided",
    "previewed",
    "corrected",
    "rolled_back",
  ] as const,
};

// Legacy Constants (for verification script compatibility)
export const TX_TYPE_VALUES = DB_ENUMS.tx_type;
export const AUM_PURPOSE_VALUES = DB_ENUMS.aum_purpose;

// UI Transaction Types (includes FIRST_INVESTMENT which maps to DEPOSIT)
export const UI_TX_TYPE_VALUES = [
  ...DB_ENUMS.tx_type,
  "FIRST_INVESTMENT",
] as const;

// DB_TX_TYPE constant object for type-safe access
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
} as const;

// Type Definitions
export type DbEnum<T extends keyof typeof DB_ENUMS> = (typeof DB_ENUMS)[T][number];
export type TxType = (typeof DB_ENUMS.tx_type)[number];
export type UITxType = (typeof UI_TX_TYPE_VALUES)[number];

export function isValidEnum<T extends keyof typeof DB_ENUMS>(
  enumName: T,
  value: unknown
): value is DbEnum<T> {
  return (DB_ENUMS[enumName] as readonly unknown[]).includes(value);
}

// ============================================================================
// Zod-like Schema Objects (simple implementation without Zod dependency)
// ============================================================================

interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: { errors: Array<{ message: string }> };
}

function createEnumSchema<T extends readonly string[]>(
  values: T,
  customErrors?: Record<string, string>
) {
  return {
    parse(value: unknown): T[number] {
      const result = this.safeParse(value);
      if (!result.success) {
        throw new Error(result.error?.errors[0]?.message || "Invalid value");
      }
      return result.data!;
    },
    safeParse(value: unknown): ParseResult<T[number]> {
      if (typeof value !== "string") {
        return {
          success: false,
          error: { errors: [{ message: "Value must be a string" }] },
        };
      }
      if (customErrors && value in customErrors) {
        return {
          success: false,
          error: { errors: [{ message: customErrors[value] }] },
        };
      }
      if (values.includes(value as T[number])) {
        return { success: true, data: value as T[number] };
      }
      return {
        success: false,
        error: { errors: [{ message: `Invalid enum value: ${value}` }] },
      };
    },
  };
}

/**
 * TxTypeSchema - validates database transaction types
 * Rejects UI-only types like FIRST_INVESTMENT with helpful error messages
 */
export const TxTypeSchema = createEnumSchema(DB_ENUMS.tx_type, {
  FIRST_INVESTMENT: "FIRST_INVESTMENT is UI-only. Use DEPOSIT for the database.",
});

/**
 * UITxTypeSchema - validates UI transaction types (includes FIRST_INVESTMENT)
 */
export const UITxTypeSchema = createEnumSchema(UI_TX_TYPE_VALUES);

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Maps UI transaction types to database types
 * FIRST_INVESTMENT -> DEPOSIT
 */
export function mapUITypeToDb(uiType: UITxType): TxType {
  if (uiType === "FIRST_INVESTMENT") {
    return "DEPOSIT";
  }
  return uiType as TxType;
}

/**
 * Safely maps UI transaction types to database types
 * Returns null for invalid types
 */
export function safeMapUITypeToDb(value: string): TxType | null {
  if (!value) return null;
  if (value === "FIRST_INVESTMENT") return "DEPOSIT";
  if (TX_TYPE_VALUES.includes(value as TxType)) {
    return value as TxType;
  }
  return null;
}

/**
 * Get default subtype for a transaction type
 */
export function getDefaultSubtype(type: string): string {
  switch (type) {
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
    case "ADJUSTMENT":
      return "adjustment";
    default:
      return type.toLowerCase();
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if value is a valid database transaction type
 */
export function isValidTxType(value: unknown): value is TxType {
  return typeof value === "string" && TX_TYPE_VALUES.includes(value as TxType);
}

/**
 * Check if value is a valid UI transaction type
 */
export function isValidUITxType(value: unknown): value is UITxType {
  return typeof value === "string" && UI_TX_TYPE_VALUES.includes(value as UITxType);
}

/**
 * Assert value is a valid database transaction type
 * Throws with helpful message for UI-only types
 */
export function assertValidTxType(value: unknown, context?: string): asserts value is TxType {
  const contextStr = context ? ` (in ${context})` : "";

  if (value === "FIRST_INVESTMENT") {
    throw new Error(`FIRST_INVESTMENT must be mapped to DEPOSIT before database operations${contextStr}`);
  }

  if (!isValidTxType(value)) {
    throw new Error(`Invalid transaction type: ${value}${contextStr}`);
  }
}
