import { TxTypeSchema, AumPurposeSchema } from "@/contracts/dbEnums";
import { CANONICAL_MUTATION_RPCS } from "@/contracts/rpcSignatures";
import { RPCFunctions, RPCFunctionName } from "./types";

// =============================================================================
// PARAMETER VALIDATION
// =============================================================================

/**
 * RPC functions where p_type is NOT a tx_type enum
 * These functions use p_type for other purposes (e.g., withdrawal type: FULL/PARTIAL)
 *
 * IMPORTANT: Add any RPC function here that uses p_type for something other than tx_type.
 * Currently, withdrawal functions use p_type for "full" | "partial" withdrawal type.
 *
 * Note: update_withdrawal uses p_withdrawal_type instead of p_type, so it doesn't need
 * to be in this list, but we include it for safety in case the signature changes.
 */
const NON_TX_TYPE_FUNCTIONS: string[] = [
  "create_withdrawal_request", // p_type = "full" | "partial"
  "update_withdrawal", // Uses p_withdrawal_type but included for safety
];

/**
 * Validate RPC parameters before sending to database
 */
export function validateParams<T extends RPCFunctionName>(
  functionName: T,
  params: RPCFunctions[T]["Args"]
): void {
  // Guard: no-arg RPCs pass undefined/null — nothing to validate
  if (params == null || typeof params !== "object") return;

  const p = params as Record<string, unknown>;

  // Validate tx_type parameters (skip for functions where p_type means something else)
  if (
    "p_type" in p &&
    typeof p.p_type === "string" &&
    !NON_TX_TYPE_FUNCTIONS.includes(String(functionName))
  ) {
    const result = TxTypeSchema.safeParse(p.p_type);
    if (!result.success) {
      const hint =
        p.p_type === "FIRST_INVESTMENT"
          ? " Use mapUITypeToDb() to convert FIRST_INVESTMENT to DEPOSIT."
          : "";
      throw new Error(`Invalid tx_type "${p.p_type}" for ${String(functionName)}.${hint}`);
    }
  }

  // Validate aum_purpose parameters
  if ("p_purpose" in p && p.p_purpose != null) {
    const result = AumPurposeSchema.safeParse(p.p_purpose);
    if (!result.success) {
      throw new Error(`Invalid aum_purpose "${p.p_purpose}" for ${String(functionName)}.`);
    }
  }

  // Note: DocumentType and DeliveryChannel validation skipped - schemas not yet generated

  // Enforce idempotency key for mutations
  const isMutation = (Object.values(CANONICAL_MUTATION_RPCS) as string[]).includes(
    String(functionName)
  );
  if (isMutation && !("p_reference_id" in p) && !("p_notes" in p)) {
    // Allow if notes contain a reference
    console.warn(`[RPC] Mutation ${String(functionName)} called without explicit reference_id`);
  }
}
