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
export { useDeleteInvestor } from "../admin/useInvestorMutations";

// Re-export types from services (backward compatibility)
export type {
  AdminInvestorSummary,
  InvestorDetailData,
  OpsIndicators,
  AdminInvestorPosition as InvestorPosition,
  InvestorPositionsData,
  AdminInvestorPosition,
} from "@/services/admin";
