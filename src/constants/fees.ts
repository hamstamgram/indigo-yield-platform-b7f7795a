/**
 * Fee-related constants
 * Central location for fee configuration
 */

const INDIGO_FEES_ACCOUNT_ID =
  import.meta.env.VITE_INDIGO_FEES_ACCOUNT_ID || "b464a3f7-60d5-4bc0-9833-7b413bcc6cae";

if (!import.meta.env.VITE_INDIGO_FEES_ACCOUNT_ID && import.meta.env.DEV) {
  console.warn(
    "[fees] VITE_INDIGO_FEES_ACCOUNT_ID not set — using default fees account. " +
      "Set it in .env for production deployments."
  );
}

export { INDIGO_FEES_ACCOUNT_ID };

export const FEE_TYPES = {
  PLATFORM: "platform",
  MANAGEMENT: "management",
  PERFORMANCE: "performance",
  IB: "ib",
} as const;

export type FeeType = (typeof FEE_TYPES)[keyof typeof FEE_TYPES];
