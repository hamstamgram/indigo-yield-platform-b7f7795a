/**
 * Fee-related constants
 * Central location for fee configuration
 */

// INDIGO Fees account ID (designated fee collection account)
// This is the account where all platform fees are credited
// TODO: Move to environment variable (VITE_INDIGO_FEES_ACCOUNT_ID) for multi-environment support
export const INDIGO_FEES_ACCOUNT_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_INDIGO_FEES_ACCOUNT_ID) ||
  "b464a3f7-60d5-4bc0-9833-7b413bcc6cae";

// Fee types
export const FEE_TYPES = {
  PLATFORM: "platform",
  MANAGEMENT: "management",
  PERFORMANCE: "performance",
  IB: "ib",
} as const;

export type FeeType = (typeof FEE_TYPES)[keyof typeof FEE_TYPES];
