/**
 * Fee-related constants
 * Central location for fee configuration
 */

// INDIGO Fees account ID (designated fee collection account)
// This is the account where all platform fees are credited
// Requires VITE_INDIGO_FEES_ACCOUNT_ID env var — will throw at runtime if not set
const _feesAccountId = import.meta.env.VITE_INDIGO_FEES_ACCOUNT_ID as string | undefined;
if (!_feesAccountId) {
  // Throw in runtime context; no-op during SSR/test where import.meta.env may be unavailable
  if (typeof import.meta !== "undefined" && import.meta.env) {
    throw new Error(
      "[fees] VITE_INDIGO_FEES_ACCOUNT_ID environment variable is not set. " +
        "Add it to your .env file. Refusing to start with a missing fees account."
    );
  }
}
export const INDIGO_FEES_ACCOUNT_ID = _feesAccountId as string;

// Fee types
export const FEE_TYPES = {
  PLATFORM: "platform",
  MANAGEMENT: "management",
  PERFORMANCE: "performance",
  IB: "ib",
} as const;

export type FeeType = (typeof FEE_TYPES)[keyof typeof FEE_TYPES];
