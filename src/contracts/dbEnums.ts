/**
 * Database Enum Contracts
 * SINGLE SOURCE OF TRUTH for database enum types
 *
 * These Zod schemas provide runtime validation to prevent enum mismatch errors.
 * They mirror the exact values from the database enums.
 *
 * Generated from: Supabase types at src/integrations/supabase/types.ts
 *
 * @example
 * ```typescript
 * import { TxTypeSchema, DB_TX_TYPE } from '@/contracts/dbEnums';
 *
 * // Runtime validation
 * const validated = TxTypeSchema.parse(userInput); // throws if invalid
 * const result = TxTypeSchema.safeParse(userInput); // returns { success, data?, error? }
 *
 * // Type-safe constants
 * const type = DB_TX_TYPE.DEPOSIT; // "DEPOSIT"
 * ```
 */

import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// =============================================================================
// TX_TYPE ENUM
// =============================================================================

/**
 * Valid tx_type values from database
 * This MUST match the database enum exactly
 */
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

/**
 * Zod schema for tx_type enum validation
 *
 * @throws ZodError if value is not a valid tx_type
 * @example
 * ```typescript
 * TxTypeSchema.parse("DEPOSIT"); // OK
 * TxTypeSchema.parse("FIRST_INVESTMENT"); // throws ZodError!
 * ```
 */
export const TxTypeSchema = z.enum(TX_TYPE_VALUES, {
  errorMap: (issue, ctx) => {
    if (issue.code === "invalid_enum_value") {
      const received = String(ctx.data);
      const hint =
        received === "FIRST_INVESTMENT"
          ? ' (FIRST_INVESTMENT is UI-only; use DEPOSIT with tx_subtype="first_investment")'
          : "";
      return {
        message: `Invalid tx_type: "${received}". Valid values: ${TX_TYPE_VALUES.join(", ")}${hint}`,
      };
    }
    return { message: ctx.defaultError };
  },
});

/**
 * TypeScript type derived from Zod schema
 * Equivalent to Database["public"]["Enums"]["tx_type"]
 */
export type TxType = z.infer<typeof TxTypeSchema>;

/**
 * Constant object for type-safe tx_type access
 * @example DB_TX_TYPE.DEPOSIT === "DEPOSIT"
 */
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

// =============================================================================
// UI TRANSACTION TYPE (includes FIRST_INVESTMENT)
// =============================================================================

/**
 * UI transaction types - includes FIRST_INVESTMENT which is UI-only
 * 
 * IMPORTANT: FIRST_INVESTMENT does NOT exist in the database tx_type enum.
 * It is a UI-only display type used to show "First Investment" in the interface.
 * 
 * When saving to the database:
 * 1. Use mapUITypeToDb("FIRST_INVESTMENT") → returns "DEPOSIT"
 * 2. Set tx_subtype = "first_investment" to preserve the context
 * 
 * This pattern allows the UI to show meaningful labels while maintaining
 * database enum integrity. The verify-enum-contracts.ts script validates
 * that TX_TYPE_VALUES matches the database exactly.
 * 
 * @see mapUITypeToDb() for the mapping function
 * @see getDefaultSubtype() for tx_subtype determination
 */
export const UI_TX_TYPE_VALUES = [...TX_TYPE_VALUES, "FIRST_INVESTMENT"] as const;

/**
 * Zod schema for UI transaction type (allows FIRST_INVESTMENT)
 */
export const UITxTypeSchema = z.enum(UI_TX_TYPE_VALUES);

/**
 * UI transaction type (allows FIRST_INVESTMENT)
 */
export type UITxType = z.infer<typeof UITxTypeSchema>;

// =============================================================================
// AUM_PURPOSE ENUM
// =============================================================================

/**
 * Valid aum_purpose values from database
 */
export const AUM_PURPOSE_VALUES = ["reporting", "transaction"] as const;

/**
 * Zod schema for aum_purpose enum
 */
export const AumPurposeSchema = z.enum(AUM_PURPOSE_VALUES);

/**
 * TypeScript type for aum_purpose
 */
export type AumPurpose = z.infer<typeof AumPurposeSchema>;

// =============================================================================
// TYPE MAPPING UTILITIES
// =============================================================================

/**
 * Map UI transaction type to DB transaction type
 * FIRST_INVESTMENT -> DEPOSIT (with tx_subtype handling elsewhere)
 *
 * @example
 * ```typescript
 * mapUITypeToDb("FIRST_INVESTMENT"); // "DEPOSIT"
 * mapUITypeToDb("DEPOSIT"); // "DEPOSIT"
 * mapUITypeToDb("WITHDRAWAL"); // "WITHDRAWAL"
 * ```
 */
export function mapUITypeToDb(uiType: UITxType): TxType {
  if (uiType === "FIRST_INVESTMENT") {
    return "DEPOSIT";
  }
  // Validate the type is a valid DB type
  return TxTypeSchema.parse(uiType);
}

/**
 * Safe version that returns null on invalid input
 */
export function safeMapUITypeToDb(uiType: string): TxType | null {
  if (uiType === "FIRST_INVESTMENT") {
    return "DEPOSIT";
  }
  const result = TxTypeSchema.safeParse(uiType);
  return result.success ? result.data : null;
}

/**
 * Get the tx_subtype for a UI transaction type
 */
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
    case "INTEREST":
    case "YIELD":
      return "yield_credit";
    default:
      return "adjustment";
  }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a string is a valid DB tx_type
 */
export function isValidTxType(value: string): value is TxType {
  return TxTypeSchema.safeParse(value).success;
}

/**
 * Check if a string is a valid UI tx_type (includes FIRST_INVESTMENT)
 */
export function isValidUITxType(value: string): value is UITxType {
  return UITxTypeSchema.safeParse(value).success;
}

/**
 * Assert a value is a valid tx_type, with user-friendly error
 * @throws Error with helpful message if invalid
 */
export function assertValidTxType(value: string, context?: string): asserts value is TxType {
  const result = TxTypeSchema.safeParse(value);
  if (!result.success) {
    const ctx = context ? ` (in ${context})` : "";
    throw new Error(
      `Invalid transaction type "${value}"${ctx}. ` +
        (value === "FIRST_INVESTMENT"
          ? "FIRST_INVESTMENT must be mapped to DEPOSIT before database operations."
          : `Valid types: ${TX_TYPE_VALUES.join(", ")}`)
    );
  }
}

// =============================================================================
// TYPE GUARDS FOR SUPABASE TYPES ALIGNMENT
// =============================================================================

// Verify our types match the generated Supabase types
type SupabaseTxType = Database["public"]["Enums"]["tx_type"];
type SupabaseAumPurpose = Database["public"]["Enums"]["aum_purpose"];

// These will cause compile errors if our types don't match Supabase types
const _txTypeCheck: TxType extends SupabaseTxType ? true : false = true;
const _txTypeCheckReverse: SupabaseTxType extends TxType ? true : false = true;
const _aumPurposeCheck: AumPurpose extends SupabaseAumPurpose ? true : false = true;
const _aumPurposeCheckReverse: SupabaseAumPurpose extends AumPurpose ? true : false = true;

// Silence unused variable warnings
void _txTypeCheck;
void _txTypeCheckReverse;
void _aumPurposeCheck;
void _aumPurposeCheckReverse;
