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

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20, // 20 significant digits
  rounding: Decimal.ROUND_HALF_UP, // Standard rounding (0.5 rounds up)
  toExpNeg: -7, // Don't use exponential notation for small numbers
  toExpPos: 21, // Don't use exponential notation for large numbers
  minE: -9e15, // Min exponent
  maxE: 9e15, // Max exponent
});

/**
 * Convert any number/string to Decimal
 * Always use this before performing calculations
 */
export function toDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value);
}

/**
 * Format money for display
 * 
 * @deprecated This function formats values as USD which violates the platform's
 * requirement that ALL ASSETS MUST BE DISPLAYED IN THEIR NATIVE CURRENCY.
 * Use formatCrypto() or the utilities in utils/assetFormatting.ts instead.
 * 
 * @param value - The amount to format
 * @param decimals - Number of decimal places (default: 2 for USD)
 * @param includeSymbol - Include $ symbol (default: true)
 */
export function formatMoney(
  value: string | number | Decimal,
  decimals: number = 2,
  includeSymbol: boolean = true
): string {
  console.warn("formatMoney() is deprecated. Use formatCrypto() for token-denominated display.");
  const decimal = toDecimal(value);
  const formatted = decimal.toFixed(decimals);
  return includeSymbol ? `$${formatted}` : formatted;
}

/**
 * Format cryptocurrency amount
 * @param value - The amount to format
 * @param decimals - Number of decimal places (default: 8 for crypto)
 * @param symbol - Token symbol (e.g., 'BTC')
 */
export function formatCrypto(
  value: string | number | Decimal,
  decimals: number = 8,
  symbol?: string
): string {
  const decimal = toDecimal(value);
  const formatted = decimal.toFixed(decimals);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Format percentage
 * @param value - The percentage value (e.g., 0.05 for 5%)
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatPercentage(value: string | number | Decimal, decimals: number = 2): string {
  const decimal = toDecimal(value).times(100);
  return `${decimal.toFixed(decimals)}%`;
}

/**
 * Calculate yield/interest
 * Formula: Principal × Rate × (Days / 365)
 *
 * @param principal - Initial investment amount
 * @param rate - Annual interest rate (decimal, e.g., 0.05 for 5%)
 * @param days - Number of days
 */
export function calculateYield(
  principal: string | number | Decimal,
  rate: string | number | Decimal,
  days: number
): Decimal {
  const principalDecimal = toDecimal(principal);
  const rateDecimal = toDecimal(rate);
  const daysPerYear = toDecimal(365);

  // Yield = Principal × Rate × (Days / 365)
  return principalDecimal.times(rateDecimal).times(days).dividedBy(daysPerYear);
}

/**
 * Calculate compound interest
 * Formula: Principal × (1 + Rate/n)^(n×time) - Principal
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
 * REMOVED: calculatePortfolioValue
 *
 * This function has been removed because it violated the platform's fundamental requirement:
 * ALL ASSETS MUST BE DISPLAYED IN THEIR NATIVE CURRENCY.
 *
 * This function was aggregating different asset types (BTC, ETH, SOL, USDT, etc.) into a single
 * USD value, which is strictly prohibited. Each asset must be tracked and displayed separately
 * in its native denomination.
 *
 * For per-asset calculations, use the native asset utilities in utils/assetFormatting.ts
 */

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

/**
 * Token-Only Formatting Guidelines
 * ================================
 * 
 * This codebase uses token-denominated accounting. All values are displayed
 * in native token units (BTC, ETH, USDT, etc.), NOT converted to fiat currencies.
 * 
 * CORRECT USAGE:
 * - formatTokenAmount(1.5, 'BTC')  → "1.50000000 BTC"
 * - formatTokenAmount(100, 'USDT') → "100.00 USDT"
 * 
 * DEPRECATED (DO NOT USE in investor-facing code):
 * - formatMoney() - Only for legacy admin contexts
 * - formatCurrency() - Only for legacy admin contexts
 * - Any Intl.NumberFormat with style: 'currency'
 * 
 * All investor-facing code MUST use formatTokenAmount() or getAssetConfig()
 * to ensure proper token display without fiat conversion.
 */
