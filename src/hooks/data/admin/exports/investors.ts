/**
 * Investor-related admin hooks - Re-exports from features/admin
 */

// Shared hooks (still in shared location)
export {
  useInvestorDetail,
  useInvestorOpsIndicators,
  useAdminInvestorPositions,
  useInvestorActivePositions,
  type InvestorDetailData,
  type OpsIndicators,
  type AdminInvestorPosition,
  type InvestorPositionsData as AdminInvestorPositionsData,
  useAdminInvestorsWithAssets,
  useAdminInvestorsList,
  useAdminAssets,
  useDeleteInvestor,
  type AdminInvestorSummary as AdminInvestorListItem,
} from "@/hooks/data/shared/useInvestorHooks";

// Admin investor hooks from new location
export {
  usePendingWithdrawalsCount as useAdminPendingWithdrawalsCount,
  useUpdateInvestorStatus as useAdminUpdateInvestorStatus,
  useCleanupInactiveInvestors,
  useUpdateFundPerformance,
} from "@/features/admin/investors/hooks/useAdminInvestorMutations";
export * from "@/features/admin/investors/hooks/useInvestorFeeSchedule";
export * from "@/features/admin/investors/hooks/useAdminInvestorWithdrawals";

// Re-export types from services
export type { InvestorStatus, CleanupResult } from "@/services/admin/investorLifecycleService";
export type { PerformanceUpdateData as AdminPerformanceUpdateData } from "@/services/admin/investorPerformanceService";
