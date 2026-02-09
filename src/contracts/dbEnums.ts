/**
 * Database Enum Contracts
 * AUTO-GENERATED - DO NOT EDIT
 *
 * Regenerate with: npm run contracts:generate
 */

import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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
      return {
        message: `Invalid app_role: "${ctx.data}". Valid: ${APP_ROLE_VALUES.join(", ")}`,
      };
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
// TYPE ALIGNMENT VERIFICATION
// =============================================================================
// These compile-time checks ensure our contracts match Supabase types

type SupabaseAppRole = Database["public"]["Enums"]["app_role"];
const _app_roleCheck: AppRole extends SupabaseAppRole
  ? SupabaseAppRole extends AppRole
    ? true
    : false
  : false = true;
void _app_roleCheck;
type SupabaseDocumentType = Database["public"]["Enums"]["document_type"];
const _document_typeCheck: DocumentType extends SupabaseDocumentType
  ? SupabaseDocumentType extends DocumentType
    ? true
    : false
  : false = true;
void _document_typeCheck;
type SupabaseNotificationType = Database["public"]["Enums"]["notification_type"];
const _notification_typeCheck: NotificationType extends SupabaseNotificationType
  ? SupabaseNotificationType extends NotificationType
    ? true
    : false
  : false = true;
void _notification_typeCheck;
type SupabaseAccountType = Database["public"]["Enums"]["account_type"];
const _account_typeCheck: AccountType extends SupabaseAccountType
  ? SupabaseAccountType extends AccountType
    ? true
    : false
  : false = true;
void _account_typeCheck;
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
type SupabaseFundStatus = Database["public"]["Enums"]["fund_status"];
const _fund_statusCheck: FundStatus extends SupabaseFundStatus
  ? SupabaseFundStatus extends FundStatus
    ? true
    : false
  : false = true;
void _fund_statusCheck;
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
