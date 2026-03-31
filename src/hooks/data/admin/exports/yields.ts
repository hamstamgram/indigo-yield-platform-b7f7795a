/**
 * Yield-related admin hooks - Re-exports from features/admin
 */

export * from "@/features/admin/yields/hooks/useYieldOperations";
export {
  useYieldRecords as useRecordedYieldsData,
  useVoidYieldDistribution,
} from "@/features/admin/yields/hooks/useRecordedYieldsPage";

// Centralized yield data hooks
export {
  useYieldRecords,
  useYieldDetails,
  useCanEditYields,
  useCanVoidYield,
  type YieldFilters,
  type YieldDetails,
} from "../useYieldData";

export { useFundYieldLock } from "../useFundYieldLock";
export type {
  YieldRecord,
  YieldRecord as RecordedYieldRecord,
  YieldFilters as RecordedYieldFilters,
} from "@/features/admin/yields/hooks/useRecordedYieldsPage";
