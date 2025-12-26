/**
 * Hooks - Main Barrel Export
 * 
 * Re-exports all hooks from subdirectories for convenient imports.
 * Import from "@/hooks" for most hooks, or from specific subdirectories
 * for more targeted imports.
 */

// Auth hooks
export * from "./auth";

// Data hooks
export * from "./data";

// UI hooks
export * from "./ui";

// Utility hooks
export { useCorrelatedMutation } from "./useCorrelatedMutation";
export type { CorrelatedMutationContext, CorrelatedMutationOptions } from "./useCorrelatedMutation";
