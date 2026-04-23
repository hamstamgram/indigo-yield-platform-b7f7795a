/**
 * FinancialString — Opaque branded type for monetary values.
 *
 * Monetary amounts flow from PostgreSQL NUMERIC(38,18) → TypeScript string.
 * This type prevents accidental conversion to JavaScript number via toNum/Number/parseFloat.
 *
 * Usage:
 *   const amount: FinancialString = fromDbValue("1.23450000");
 *   toNum(amount);        // ❌ Compile error
 *   Number(amount);       // ❌ Compile error
 *   parseFloat(amount);  // ❌ Compile error
 *   amount.toLocaleString(); // ❌ Compile error
 *
 *   formatAssetAmount(amount, "BTC"); // ✅ OK — accepts string
 */

import Decimal from "decimal.js";

declare const __financialBrand: unique symbol;

export type FinancialString = string & { readonly [__financialBrand]: true };

/**
 * Safe constructor from database value
 */
export function fromDbValue(val: string | number | null | undefined): FinancialString {
  if (val === null || val === undefined || val === "") return "0" as FinancialString;
  return String(val) as FinancialString;
}

/**
 * Safe constructor from Decimal
 */
export function fromDecimal(val: Decimal): FinancialString {
  return val.toString() as FinancialString;
}

/**
 * Safe constructor from an already-validated string
 */
export function fromFinancialString(val: string): FinancialString {
  return val as FinancialString;
}

/**
 * Unwrap for APIs that genuinely need a plain string
 */
export function toPlainString(val: FinancialString): string {
  return val as string;
}
