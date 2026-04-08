/**
 * Investor-related admin hooks - Re-exports from features/admin
 */

// Shared hooks (now in feature location)
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
} from "@/features/admin/investors/hooks/useInvestorHooks";

// Admin investor hooks from new location
export {
  usePendingWithdrawalsCount as useAdminPendingWithdrawalsCount,
  useUpdateInvestorStatus as useAdminUpdateInvestorStatus,
  useCleanupInactiveInvestors,
  useUpdateFundPerformance,
} from "@/features/admin/investors/hooks/useAdminInvestorMutations";
export * from "@/features/admin/investors/hooks/useAdminInvestorWithdrawals";

// Centralized investor mutations
export { useCreateInvestor, useDeleteInvestor as useAdminDeleteInvestorAction } from "@/features/admin/investors/hooks/useInvestorMutations";

// Investor wizard
export {
  useCreateInvestorWizard,
  type WizardResult,
  type WizardProgressCallback,
} from "@/features/admin/investors/hooks/useInvestorWizard";

// Re-export types from services
export type {
  InvestorStatus,
  CleanupResult,
} from "@/features/admin/investors/services/investorLifecycleService";
export type { PerformanceUpdateData as AdminPerformanceUpdateData } from "@/features/admin/investors/services/investorPerformanceService";
