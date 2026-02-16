/**
 * Yield Services - Sub-barrel
 * All yield-related admin services consolidated here
 */

// Distribution facade (re-exports from sub-services)
export * from "./yieldDistributionService";

// Preview
export { previewYieldDistribution } from "./yieldPreviewService";

// Apply
export { applyYieldDistribution } from "./yieldApplyService";

// History
export {
  getFundAUMHistory,
  getLatestFundAUM,
  getCurrentFundAUM,
  saveDraftAUMEntry,
  getActiveFundsWithAUM,
  getFundInvestorCompositionWithYield,
  getFundInvestorCompositionWithYield as getFundInvestorComposition,
  getStatementPeriodId,
  getInvestorPositionsWithFunds,
  checkExistingDistribution,
} from "./yieldHistoryService";

// Reports
export {
  getInvestorPerformanceForPeriod,
  getInvestorFeeSchedule,
  getInvestorMonthlyReports,
  createMonthlyReportTemplate,
  updateMonthlyReportField,
} from "./yieldReportsService";

// Crystallization
export {
  crystallizeYieldBeforeFlow,
  finalizeMonthYield,
  getYieldEventsForFund,
  getYieldEventsForInvestor,
  getAggregatedYieldForPeriod,
  getPendingYieldEventsCount,
  crystallizeMonthEnd,
  getInvestorCrystallizationEvents,
  type CrystallizationResult,
  type InvestorCrystallizationEvent,
  type FinalizationResult,
  type YieldEvent,
} from "./yieldCrystallizationService";

// Management (void, edit, details)
export {
  voidYieldRecord,
  voidYieldDistribution,
  updateYieldAum,
  getYieldDetails,
  canVoidYieldRecord,
  canEditYieldRecord,
  getYieldVoidImpact,
  type VoidYieldResult,
  type UpdateYieldResult,
  type VoidAumImpactResult,
  type YieldDetails,
} from "./yieldManagementService";

// Distributions page data
export {
  fetchYieldDistributionsPageData,
  type YieldDistributionsFilters,
  type DistributionRow,
  type AllocationRow,
  type FeeAllocationRow,
  type YieldEventRow,
  type InvestorProfile,
  type YieldDistributionsPageData,
} from "./yieldDistributionsPageService";
