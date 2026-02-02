/**
 * Yield-related admin hooks - Re-exports from features/admin
 */

export * from "@/features/admin/yields/hooks/useYieldOperations";
export {
  useYieldRecords as useRecordedYieldsData,
  useYieldCorrectionHistory,
  useRecordCorrectionHistory,
  useVoidYieldRecord as useVoidYieldMutation,
  useVoidYieldDistribution,
  useUpdateYieldAum,
} from "@/features/admin/yields/hooks/useRecordedYieldsPage";
export type {
  YieldRecord,
  YieldRecord as RecordedYieldRecord,
  CorrectionHistoryItem,
  YieldFilters as RecordedYieldFilters,
} from "@/features/admin/yields/hooks/useRecordedYieldsPage";
