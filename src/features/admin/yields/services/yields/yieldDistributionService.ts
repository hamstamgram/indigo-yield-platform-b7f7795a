/**
 * Yield Distribution Service
 *
 * REFACTORED: This file now re-exports from focused sub-services:
 * - yieldPreviewService.ts - Preview calculations
 * - yieldApplyService.ts - Apply distributions
 * - yieldHistoryService.ts - AUM history and fund data
 * - yieldReportsService.ts - Performance reports
 *
 * Import from this file for backwards compatibility.
 * For new code, import directly from the specific service.
 */

// Re-export types from canonical source
export type {
  YieldCalculationInput,
  YieldDistribution,
  IBCredit,
  YieldTotals,
  YieldCalculationResult,
  FundDailyAUM,
  YieldSnapshotInfo,
  YieldPurpose,
  YieldStatus,
} from "@/types/domains/yield";

// Preview service
export { previewYieldDistribution } from "./yieldPreviewService";

// Apply service
export { applyYieldDistribution } from "./yieldApplyService";

// History service
export {
  getFundAUMHistory,
  getLatestFundAUM,
  getCurrentFundAUM,
  saveDraftAUMEntry,
  getActiveFundsWithAUM,
  getFundInvestorCompositionWithYield,
  getStatementPeriodId,
  getInvestorPositionsWithFunds,
  checkExistingDistribution,
} from "./yieldHistoryService";

// Reports service
export {
  getInvestorPerformanceForPeriod,
  getInvestorFeeSchedule,
  getInvestorMonthlyReports,
  createMonthlyReportTemplate,
  updateMonthlyReportField,
} from "./yieldReportsService";
