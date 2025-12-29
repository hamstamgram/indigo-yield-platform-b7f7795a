/**
 * Admin Hooks Index
 * Exports all admin-related React Query hooks
 */

export {
  usePendingWithdrawalsCount,
  useUpdateInvestorStatus,
  useLockPositions,
  useCleanupInactiveInvestors,
  useUpdateFundPerformance,
} from "./useAdminInvestorMutations";

// Re-export types
export type { InvestorStatus, CleanupResult } from "@/services/admin/investorLifecycleService";
export type { PerformanceUpdateData } from "@/services/admin/investorPerformanceService";
