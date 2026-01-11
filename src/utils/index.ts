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
// Exclude formatAssetAmount from assets.ts - use formatters version instead
export { formatSignedAssetAmount } from "./assets";

// Cache management
export * from "./cacheInvalidation";

// Security & encryption
export * from "./encryption";
export * from "./sanitize";
export * from "./security-logger";
export * from "./session-manager";

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

export * from "./kpiCalculations";

// Statement calculations - exclude formatTokenAmount (use formatters version)
export {
  type StatementData,
  type AssetStatement,
  type Transaction,
  calculateRateOfReturn,
  computeStatement,
  formatPercent,
} from "./statementCalculations";

// Formatting utilities - canonical source for:
// formatAssetAmount, formatPercentage, formatTokenAmount
export * from "./formatters";

// PDF generation
export * from "./investorReportPdf";
export * from "./statementPdfGenerator";
export * from "./statementStorage";

// Dynamic imports & lazy loading
export * from "./dynamicImport";
// Note: lazyWithRetry.tsx re-exports from dynamicImport, skip to avoid conflicts
