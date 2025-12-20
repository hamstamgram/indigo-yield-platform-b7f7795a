/**
 * Fee-related constants
 * Central location for fee configuration
 */

// INDIGO Fees account ID (designated fee collection account)
// This is the account where all platform fees are credited
export const INDIGO_FEES_ACCOUNT_ID = "169bb053-36cb-4f6e-93ea-831f0dfeaf1d";

// Fee types
export const FEE_TYPES = {
  PLATFORM: "platform",
  MANAGEMENT: "management",
  PERFORMANCE: "performance",
  IB: "ib",
} as const;

export type FeeType = (typeof FEE_TYPES)[keyof typeof FEE_TYPES];
