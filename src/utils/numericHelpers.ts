/**
 * Numeric Helpers
 * Core utilities for converting between string (database precision) and number (UI calculations)
 */

/**
 * Convert a string or number to number for UI calculations
 * Safe for use with database NUMERIC fields that come as strings
 * @alias toNum - shorter alias for convenience
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Shorter alias for toNumber
 */
export const toNum = toNumber;

/**
 * Convert a value to string for database storage
 * Preserves precision for NUMERIC fields
 */
export function toNumericString(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
}

/**
 * Check if a numeric value (string or number) is greater than a threshold
 */
export function isGreaterThan(value: string | number | null | undefined, threshold: number): boolean {
  return toNumber(value) > threshold;
}

/**
 * Check if a numeric value (string or number) is greater than or equal to a threshold
 */
export function isGreaterThanOrEqual(value: string | number | null | undefined, threshold: number): boolean {
  return toNumber(value) >= threshold;
}

/**
 * Check if a numeric value (string or number) is less than a threshold
 */
export function isLessThan(value: string | number | null | undefined, threshold: number): boolean {
  return toNumber(value) < threshold;
}

/**
 * Check if a numeric value (string or number) is less than or equal to a threshold
 */
export function isLessThanOrEqual(value: string | number | null | undefined, threshold: number): boolean {
  return toNumber(value) <= threshold;
}

/**
 * Format a numeric value for display with locale formatting
 */
export function formatNumericValue(
  value: string | number | null | undefined,
  options: Intl.NumberFormatOptions = {}
): string {
  const num = toNumber(value);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 6,
    ...options,
  }).format(num);
}

/**
 * Get the sign prefix for a numeric value
 */
export function getSignPrefix(value: string | number | null | undefined): string {
  const num = toNumber(value);
  return num > 0 ? "+" : num < 0 ? "" : "";
}

/**
 * Calculate percentage: (value / base) * 100
 * Returns 0 if base is 0 to avoid division by zero
 */
export function calculatePercentage(value: string | number, base: string | number): number {
  const numBase = toNumber(base);
  if (numBase === 0) return 0;
  return (toNumber(value) / numBase) * 100;
}

/**
 * Subtract two numeric values: a - b
 */
export function subtract(a: string | number, b: string | number): number {
  return toNumber(a) - toNumber(b);
}

/**
 * Add two numeric values: a + b
 */
export function add(a: string | number, b: string | number): number {
  return toNumber(a) + toNumber(b);
}

/**
 * Multiply two numeric values: a * b
 */
export function multiply(a: string | number, b: string | number): number {
  return toNumber(a) * toNumber(b);
}

/**
 * Divide two numeric values: a / b
 * Returns 0 if b is 0
 */
export function divide(a: string | number, b: string | number): number {
  const numB = toNumber(b);
  if (numB === 0) return 0;
  return toNumber(a) / numB;
}
