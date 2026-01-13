/**
 * Investor-related admin hooks
 */

// useInvestorDetail
export {
  useInvestorDetail,
  useInvestorOpsIndicators,
  useInvestorPositions as useAdminInvestorPositions,
  useInvestorActivePositions,
  type InvestorDetailData,
  type OpsIndicators,
  type InvestorPosition as AdminInvestorPosition,
  type InvestorPositionsData as AdminInvestorPositionsData,
} from "../useInvestorDetail";

// useAdminInvestorsWithAssets
export {
  useAdminInvestorsWithAssets,
  useAdminInvestorsList,
  useAdminAssets,
  useDeleteInvestor,
  type AdminInvestorSummary as AdminInvestorListItem,
} from "../useAdminInvestorsWithAssets";

// useAdminInvestorMutations
export {
  usePendingWithdrawalsCount as useAdminPendingWithdrawalsCount,
  useUpdateInvestorStatus as useAdminUpdateInvestorStatus,
  useCleanupInactiveInvestors,
  useUpdateFundPerformance,
} from "../useAdminInvestorMutations";

// Re-export types from services
export type { InvestorStatus, CleanupResult } from "@/services/admin/investorLifecycleService";
export type { PerformanceUpdateData as AdminPerformanceUpdateData } from "@/services/admin/investorPerformanceService";

// useInvestorFeeSchedule
export { useInvestorFeeSchedule, type FeeScheduleEntry } from "../useInvestorFeeSchedule";

// useAdminInvestorWithdrawals
export { useAdminInvestorWithdrawals } from "../useAdminInvestorWithdrawals";
