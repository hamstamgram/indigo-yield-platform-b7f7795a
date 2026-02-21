/**
 * Yield Services - Sub-barrel
 * All yield-related admin services consolidated here
 */

// Distribution facade (re-exports from sub-services)
export * from "./yieldDistributionService";

// Crystallization
export {
  finalizeMonthYield,
  getYieldEventsForFund,
  getYieldEventsForInvestor,
  getAggregatedYieldForPeriod,
  getPendingYieldEventsCount,
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

// AUM Consistency & Reconciliation
export {
  yieldAumService,
  type AumPurpose,
  type AumAsOfResult,
  type AumReconciliationResult,
} from "./yieldAumService";
