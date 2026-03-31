import Decimal from "decimal.js";

/**
 * Institutional Numeric Utilities
 * Standardized on Decimal.js for absolute precision (18+ decimals)
 * 
 * Domain types use `string` for NUMERIC(38,18) precision preservation from the database.
 */

/**
 * Safely parse a numeric string or number into a Decimal object.
 * Returns Decimal(0) for invalid inputs.
 */
export function parseFinancial(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  try {
    return new Decimal(String(value));
  } catch {
    return new Decimal(0);
  }
}

/**
 * Convert a financial string/number to a JS number for legacy UI components.
 * WARNING: Potential precision loss for values > 15 significant digits.
 */
export function toNumber(value: string | number | null | undefined): number {
  return parseFinancial(value).toNumber();
}

/**
 * Shorter alias for toNumber
 */
export const toNum = toNumber;

/**
 * Convert a value to string for database storage
 * Preserves full 18rd-decimal precision
 */
export function toNumericString(value: string | number | null | undefined): string {
  return parseFinancial(value).toString();
}

/**
 * Formats a value for institutional display
 */
export function formatInstitutional(value: string | number | null | undefined, decimals = 8): string {
  return parseFinancial(value).toFixed(decimals);
}

export function isGreaterThan(value: string | number | null | undefined, threshold: string | number): boolean {
  return parseFinancial(value).gt(parseFinancial(threshold));
}

export function isGreaterThanOrEqual(value: string | number | null | undefined, threshold: string | number): boolean {
  return parseFinancial(value).gte(parseFinancial(threshold));
}

export function isLessThan(value: string | number | null | undefined, threshold: string | number): boolean {
  return parseFinancial(value).lt(parseFinancial(threshold));
}

export function isLessThanOrEqual(value: string | number | null | undefined, threshold: string | number): boolean {
  return parseFinancial(value).lte(parseFinancial(threshold));
}

export function add(a: string | number, b: string | number): string {
  return parseFinancial(a).plus(parseFinancial(b)).toString();
}

export function subtract(a: string | number, b: string | number): string {
  return parseFinancial(a).minus(parseFinancial(b)).toString();
}

export function multiply(a: string | number, b: string | number): string {
  return parseFinancial(a).times(parseFinancial(b)).toString();
}

export function divide(a: string | number, b: string | number): string {
  const decB = parseFinancial(b);
  if (decB.isZero()) return "0";
  return parseFinancial(a).div(decB).toString();
}
