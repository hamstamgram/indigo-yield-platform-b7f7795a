/**
 * Fee-related admin hooks
 * Re-exports from features/admin/fees/hooks
 */

export {
  useFeesOverview,
  useFeeFunds,
  useFeeTransactions,
  useIndigoFeesBalance,
  useFeeAllocations,
  useYieldEarned,
  type FeesOverviewData,
  type FeeRecord,
  type FeeAllocation,
  type YieldEarned,
  type FeeSummary,
} from "@/features/admin/fees/hooks/useFees";
