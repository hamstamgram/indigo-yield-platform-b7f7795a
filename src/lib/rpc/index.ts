import { isValidTxType, mapUITypeToDb } from "@/contracts/dbEnums";
import { normalizeError } from "./normalization";
import { validateParams } from "./validation";
import { call, callNoArgs, deposit, withdrawal, applyYield, previewYield } from "./client";

export const rpc = {
  /** Generic RPC call with full type safety */
  call,
  /** RPC call for functions with no arguments */
  callNoArgs,

  // Canonical mutation helpers
  /** Create deposit with crystallization */
  deposit,
  /** Create withdrawal with crystallization */
  withdrawal,
  /** Apply yield distribution */
  applyYield,
  /** Preview yield distribution */
  previewYield,

  // Utilities
  /** Map UI transaction type to DB type */
  mapUITypeToDb,
  /** Check if a value is a valid DB transaction type */
  isValidTxType,
};

// Re-export for convenience
export { normalizeError, validateParams };
export type { RPCResult, RPCError } from "./types";
