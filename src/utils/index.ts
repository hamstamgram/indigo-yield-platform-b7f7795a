/**
 * Utils - Barrel export for all utility functions
 *
 * Note: GDPR compliance moved to src/lib/gdpr/
 * Note: Password reset moved to src/lib/auth/
 */

// Account utilities (system account detection, filtering)
export * from "./accountUtils";

// Asset utilities
export * from "./assetUtils";
export * from "./assetValidation";
// Asset formatting: formatAssetAmount (with symbol) from assets.ts is canonical
export { formatAssetAmount, formatSignedAssetAmount } from "./assets";

// Cache management
export * from "./cacheInvalidation";

// Security
export * from "./sanitize";
export * from "./security-logger";
// Financial calculations - exclude formatPercentage (use formatters version)
export {
  toDecimal,
  formatCrypto,
  calculateYield,
  calculateCompoundInterest,
  calculateFee,
  calculateNetAmount,
  calculatePercentageChange,
  calculateProfitLoss,
  calculateAverage,
  calculateWeightedAverage,
  isInRange,
  clamp,
  toDbFormat,
  fromDbFormat,
  validatePositiveAmount,
  validateNonNegativeAmount,
  validatePercentage,
  Decimal,
} from "./financial";

// Note: kpiCalculations exports formatAssetValue - use formatters version for number-only formatting
export {
  calculateTotalAUM,
  calculateInvestorCount,
  calculateAllKPIs,
  type AssetKPI,
} from "./kpiCalculations";

// Statement calculations
export {
  type StatementData,
  type AssetStatement,
  type StatementTransaction,
  calculateRateOfReturn,
  computeStatement,
  formatPercent,
} from "./statementCalculations";

// Formatting utilities - canonical source for:
// formatAssetAmount, formatPercentage, formatTokenAmount
export * from "./formatters";

// Statement storage
export * from "./statementStorage";

// Dynamic imports & lazy loading
export * from "./dynamicImport";
