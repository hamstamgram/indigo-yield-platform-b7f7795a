/**
 * Numeric Utilities
 * Helpers for converting between string (database precision) and number (UI calculations)
 * 
 * Domain types use `string` for NUMERIC(28,10) precision preservation from the database.
 * UI components often need `number` for arithmetic, comparisons, and formatting.
 */

// Re-export everything from numericHelpers for convenient access
export {
  toNumber,
  toNum,
  toNumericString,
  isGreaterThan,
  isGreaterThanOrEqual,
  isLessThan,
  isLessThanOrEqual,
  formatNumericValue,
  getSignPrefix,
  calculatePercentage,
  subtract,
  add,
  multiply,
  divide,
} from "./numericHelpers";
