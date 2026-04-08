/**
 * Investor Hooks - Barrel Export
 * Split into focused modules for maintainability.
 */

// Queries
export {
  useInvestors,
  useAdminInvestorsList,
  useAdminAssets,
  useAdminInvestorsWithAssets,
} from "./useInvestorQueries";

// Detail hooks
export {
  useInvestorDetail,
  useInvestorOpsIndicators,
  useAdminInvestorPositions,
  useInvestorPositions, // Deprecated alias for useAdminInvestorPositions
  useInvestorActivePositions,
} from "./useInvestorDetailHooks";

// Enrichment
export {
  useUnifiedInvestors,
  type EnrichedInvestor,
  type UnifiedInvestorsData,
} from "./useInvestorEnrichment";

// Mutations
export { useDeleteInvestor } from "@/features/admin/investors/hooks/useInvestorMutations";

// Re-export types from services (backward compatibility)
export type {
  AdminInvestorSummary,
} from "@/features/admin/investors/services/adminService";
export type {
  InvestorDetailData,
  OpsIndicators,
  InvestorPositionsData,
  AdminInvestorPosition as InvestorPosition,
  AdminInvestorPosition,
} from "@/features/admin/investors/services/investorDetailService";
