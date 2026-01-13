/**
 * Yield-related admin hooks
 */

// useYieldOperations
export { 
  useActiveFundsWithAUM, 
  useFundInvestorComposition, 
  useApplyYieldDistribution,
  type YieldCalculationInput,
} from "../useYieldOperations";

// useRecordedYieldsPage
export {
  useYieldRecords as useRecordedYieldsData,
  useYieldCorrectionHistory,
  useRecordCorrectionHistory,
  useVoidYieldRecord as useVoidYieldMutation,
  useVoidYieldDistribution,
  useUpdateYieldAum,
  type YieldRecord as RecordedYieldRecord,
  type YieldFilters as RecordedYieldFilters,
  type CorrectionHistoryItem,
} from "../useRecordedYieldsPage";
