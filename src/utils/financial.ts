/**
 * Financial Utilities — re-exports from shared package
 *
 * Canonical source: packages/shared/financial.ts
 */

export {
  Decimal,
  toDecimal,
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
  parseFinancial,
  toFinancialString,
  sumFinancials,
  compareFinancials,
  isFinancialGte,
  isFinancialLt,
  isFinancialZero,
  toDisplayString,
  formatFinancialDisplay,
  formatCrypto,
  calculateYield,
} from "../../packages/shared/financial";

export type { FinancialString } from "../../packages/shared/financial";
