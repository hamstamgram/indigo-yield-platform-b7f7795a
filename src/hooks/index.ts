/**
 * Hooks - Main Barrel Export
 * 
 * Re-exports all hooks from subdirectories for convenient imports.
 * Import from "@/hooks" for most hooks, or from specific subdirectories
 * for more targeted imports.
 */

// Auth hooks
export * from "./auth";

// Data hooks (shared only - admin/investor barrels removed in Phase 1B)
export * from "./data/shared";

// UI hooks
export * from "./ui";

// Utility hooks
export { useCorrelatedMutation } from "./useCorrelatedMutation";
export type { CorrelatedMutationContext, CorrelatedMutationOptions } from "./useCorrelatedMutation";

// Prefetch hooks
export { usePrefetchOnHover } from "./usePrefetchOnHover";
export { useAdminInitialPrefetch } from "./useAdminInitialPrefetch";
