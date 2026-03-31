/**
 * Financial Utilities with Decimal.js
 *
 * CRITICAL: All financial calculations MUST use Decimal.js
 * JavaScript native numbers use floating-point arithmetic which causes
 * precision errors in financial calculations.
 *
 * Example of the problem:
 * 0.1 + 0.2 = 0.30000000000000004 (JavaScript)
 * 0.1 + 0.2 = 0.3 (Decimal.js)
 *
 * Install: npm install decimal.js
 */

import Decimal from "decimal.js";
import { logWarn } from "@/lib/logger";

// Configure Decimal.js for financial calculations
// Precision must exceed NUMERIC(38,18) max of 38 significant digits
Decimal.set({
  precision: 50,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -18,
  toExpPos: 18,
});

/**
 * Robust conversion to Decimal
 * Safely handles null, undefined, string, and number inputs
 */
export function toDecimal(value: string | number | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  if (value instanceof Decimal) {
    return value;
  }
  try {
    return new Decimal(String(value));
  } catch (error) {
    logWarn("financial.toDecimal", {
      reason: "Invalid numeric value, defaulting to 0",
      value: String(value),
      error: error instanceof Error ? error.message : String(error),
    });
    return new Decimal(0);
  }
}

/**
 * Calculate compound interest
 * Formula: A = P(1 + r/n)^(nt)
 * Interest = A - P = Principal × (1 + Rate/n)^(n×time) - Principal
 *
 * @param principal - Initial investment amount
 * @param rate - Annual interest rate (decimal)
 * @param years - Time period in years
 * @param compoundingFrequency - Times compounded per year (default: 365 for daily)
 */
export function calculateCompoundInterest(
  principal: string | number | Decimal,
  rate: string | number | Decimal,
  years: number,
  compoundingFrequency: number = 365
): Decimal {
  const p = toDecimal(principal);
  const r = toDecimal(rate);
  const n = toDecimal(compoundingFrequency);
  const t = toDecimal(years);

  // A = P(1 + r/n)^(nt)
  const ratePerPeriod = r.dividedBy(n);
  const exponent = n.times(t);
  const base = toDecimal(1).plus(ratePerPeriod);

  const finalAmount = p.times(base.pow(exponent));
  const interest = finalAmount.minus(p);

  return interest;
}

/**
 * Calculate fee amount
 * @param amount - Base amount
 * @param feePercentage - Fee percentage (e.g., 0.25 for 0.25%)
 */
export function calculateFee(
  amount: string | number | Decimal,
  feePercentage: string | number | Decimal
): Decimal {
  const amountDecimal = toDecimal(amount);
  const feeDecimal = toDecimal(feePercentage);

  // Fee = Amount × (FeePercentage / 100)
  return amountDecimal.times(feeDecimal).dividedBy(100);
}

/**
 * Calculate amount after fee deduction
 * @param amount - Gross amount
 * @param feePercentage - Fee percentage
 */
export function calculateNetAmount(
  amount: string | number | Decimal,
  feePercentage: string | number | Decimal
): Decimal {
  const amountDecimal = toDecimal(amount);
  const fee = calculateFee(amountDecimal, feePercentage);
  return amountDecimal.minus(fee);
}

/**
 * Calculate percentage change
 * @param oldValue - Previous value
 * @param newValue - Current value
 */
export function calculatePercentageChange(
  oldValue: string | number | Decimal,
  newValue: string | number | Decimal
): Decimal {
  const old = toDecimal(oldValue);
  const current = toDecimal(newValue);

  if (old.isZero()) {
    return toDecimal(0); // Avoid division by zero
  }

  // Change = ((New - Old) / Old) × 100
  return current.minus(old).dividedBy(old).times(100);
}

/**
 * Calculate profit/loss
 * @param cost - Initial cost
 * @param current - Current value
 */
export function calculateProfitLoss(
  cost: string | number | Decimal,
  current: string | number | Decimal
): {
  amount: Decimal;
  percentage: Decimal;
  isProfit: boolean;
} {
  const costDecimal = toDecimal(cost);
  const currentDecimal = toDecimal(current);

  const amount = currentDecimal.minus(costDecimal);
  const percentage = calculatePercentageChange(costDecimal, currentDecimal);

  return {
    amount,
    percentage,
    isProfit: amount.greaterThanOrEqualTo(0),
  };
}

/**
 * Calculate average (mean)
 * @param values - Array of values
 */
export function calculateAverage(values: Array<string | number | Decimal>): Decimal {
  if (values.length === 0) {
    return toDecimal(0);
  }

  let sum = toDecimal(0);
  for (const value of values) {
    sum = sum.plus(toDecimal(value));
  }

  return sum.dividedBy(values.length);
}

/**
 * Calculate weighted average
 * @param values - Array of {value, weight}
 */
export function calculateWeightedAverage(
  values: Array<{ value: string | number; weight: string | number }>
): Decimal {
  if (values.length === 0) {
    return toDecimal(0);
  }

  let weightedSum = toDecimal(0);
  let totalWeight = toDecimal(0);

  for (const item of values) {
    const value = toDecimal(item.value);
    const weight = toDecimal(item.weight);

    weightedSum = weightedSum.plus(value.times(weight));
    totalWeight = totalWeight.plus(weight);
  }

  if (totalWeight.isZero()) {
    return toDecimal(0);
  }

  return weightedSum.dividedBy(totalWeight);
}

/**
 * Check if value is within range (inclusive)
 * @param value - Value to check
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function isInRange(
  value: string | number | Decimal,
  min: string | number | Decimal,
  max: string | number | Decimal
): boolean {
  const valueDecimal = toDecimal(value);
  const minDecimal = toDecimal(min);
  const maxDecimal = toDecimal(max);

  return (
    valueDecimal.greaterThanOrEqualTo(minDecimal) && valueDecimal.lessThanOrEqualTo(maxDecimal)
  );
}

/**
 * Clamp value within range
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function clamp(
  value: string | number | Decimal,
  min: string | number | Decimal,
  max: string | number | Decimal
): Decimal {
  const valueDecimal = toDecimal(value);
  const minDecimal = toDecimal(min);
  const maxDecimal = toDecimal(max);

  if (valueDecimal.lessThan(minDecimal)) {
    return minDecimal;
  }
  if (valueDecimal.greaterThan(maxDecimal)) {
    return maxDecimal;
  }
  return valueDecimal;
}

/**
 * Convert to database format (string with 8 decimals)
 * @param value - Value to convert
 */
export function toDbFormat(value: string | number | Decimal): string {
  return toDecimal(value).toFixed(8);
}

/**
 * Parse from database format
 * @param value - Database value (string)
 */
export function fromDbFormat(value: string | null | undefined): Decimal {
  if (!value) {
    return toDecimal(0);
  }
  return toDecimal(value);
}

/**
 * Validate amount is positive
 * @param value - Value to validate
 * @throws Error if value is not positive
 */
export function validatePositiveAmount(
  value: string | number | Decimal,
  fieldName: string = "Amount"
): Decimal {
  const decimal = toDecimal(value);

  if (decimal.lessThanOrEqualTo(0)) {
    throw new Error(`${fieldName} must be positive`);
  }

  return decimal;
}

/**
 * Validate amount is non-negative
 * @param value - Value to validate
 * @throws Error if value is negative
 */
export function validateNonNegativeAmount(
  value: string | number | Decimal,
  fieldName: string = "Amount"
): Decimal {
  const decimal = toDecimal(value);

  if (decimal.lessThan(0)) {
    throw new Error(`${fieldName} cannot be negative`);
  }

  return decimal;
}

/**
 * Validate percentage is between 0 and 100
 * @param value - Percentage value
 * @throws Error if value is out of range
 */
export function validatePercentage(
  value: string | number | Decimal,
  fieldName: string = "Percentage"
): Decimal {
  const decimal = toDecimal(value);

  if (decimal.lessThan(0) || decimal.greaterThan(100)) {
    throw new Error(`${fieldName} must be between 0 and 100`);
  }

  return decimal;
}

// Export Decimal for direct use if needed
export { Decimal };

// ============ String Financial Type Helpers ============
// These helpers support the string-based financial types used in domain types
// to preserve NUMERIC(28,10) precision from the database

/**
 * Type alias for string-based financial values
 * Used to preserve NUMERIC(28,10) precision from PostgreSQL
 */
export type FinancialString = string;

/**
 * Parse any financial value to Decimal for calculations
 * Safely handles null, undefined, string, and number inputs
 */
export function parseFinancial(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  try {
    return new Decimal(String(value));
  } catch {
    logWarn("financial.parseFinancial", {
      reason: "Invalid value, defaulting to 0",
      value: String(value),
    });
    return new Decimal(0);
  }
}

/**
 * Convert a calculated value back to string for storage/display
 * Preserves up to 18 decimal places (matching NUMERIC(38,18))
 */
export function toFinancialString(value: Decimal | number | string): FinancialString {
  return new Decimal(String(value)).toFixed(18);
}

/**
 * Sum multiple financial values safely
 * Returns string to preserve precision
 */
export function sumFinancials(values: (string | number | null | undefined)[]): FinancialString {
  return values.reduce((acc, v) => acc.plus(parseFinancial(v)), new Decimal(0)).toFixed(18);
}

/**
 * Compare two financial values
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareFinancials(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): -1 | 0 | 1 {
  const decA = parseFinancial(a);
  const decB = parseFinancial(b);
  return decA.comparedTo(decB) as -1 | 0 | 1;
}

/**
 * Check if a financial value is greater than or equal to a threshold
 */
export function isFinancialGte(
  value: string | number | null | undefined,
  threshold: string | number
): boolean {
  return parseFinancial(value).gte(parseFinancial(threshold));
}

/**
 * Check if a financial value is less than a threshold
 */
export function isFinancialLt(
  value: string | number | null | undefined,
  threshold: string | number
): boolean {
  return parseFinancial(value).lt(parseFinancial(threshold));
}

/**
 * Check if a financial value is zero or effectively zero
 */
export function isFinancialZero(value: string | number | null | undefined): boolean {
  return parseFinancial(value).isZero();
}

/**
 * Format a financial string for display (removes trailing zeros)
 * Use this for UI display, not for storage
 */
export function formatFinancialDisplay(
  value: string | number | null | undefined,
  maxDecimals: number = 8
): string {
  const dec = parseFinancial(value);
  // Use toFixed then remove trailing zeros
  const fixed = dec.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, "") || "0";
}

/**
 * Institutional Percentage Formatter
 * Unified source of truth for all percentage displays.
 */

/**
 * Token-Only Formatting Guidelines
 */
export function formatCrypto(amount: any, decimals?: any, symbol?: any): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (typeof amount === 'number' ? amount : parseFloat(String(amount)));
  const sym = typeof decimals === 'string' ? decimals : symbol;
  const dec = typeof decimals === 'number' ? decimals : 8;
  return `${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: dec })} ${sym || ""}`;
}

/**
 * Calculate yield (legacy member)
 */
export function calculateYield(amount: string | number | Decimal, yieldRate: string | number | Decimal): Decimal {
  const a = toDecimal(amount);
  const y = toDecimal(yieldRate);
  return a.times(y).dividedBy(100);
}
