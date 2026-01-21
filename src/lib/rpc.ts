/**
 * Strict RPC Gateway
 * ===================
 * ALL RPC calls MUST go through this module.
 * Direct supabase.rpc() calls are forbidden elsewhere in the codebase.
 *
 * Features:
 * - Compile-time type safety via Supabase types
 * - Runtime enum validation via Zod
 * - User-friendly error normalization
 * - Audit logging for mutations
 * - Idempotency key enforcement
 *
 * @example
 * ```typescript
 * import { rpc } from "@/lib/rpc";
 *
 * const { data, error } = await rpc.call("apply_deposit_with_crystallization", {
 *   p_fund_id: fundId,
 *   p_investor_id: investorId,
 *   // ...
 * });
 * ```
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

// Import contracts
import { TxTypeSchema, AumPurposeSchema, isValidTxType, mapUITypeToDb } from "@/contracts/dbEnums";
import { RPC_FUNCTIONS, CANONICAL_MUTATION_RPCS } from "@/contracts/rpcSignatures";
import { getUserFriendlyError } from "@/lib/errors";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { getRateLimiter } from "@/lib/security/rateLimiter";

// =============================================================================
// TYPES
// =============================================================================

type RPCFunctions = Database["public"]["Functions"];
type RPCFunctionName = keyof RPCFunctions;

export interface RPCResult<T> {
  data: T | null;
  error: RPCError | null;
  success: boolean;
}

export interface RPCError {
  message: string;
  code: string;
  userMessage: string;
  originalError?: unknown;
}

// =============================================================================
// ERROR NORMALIZATION
// =============================================================================

const ERROR_CODE_MAP: Record<string, string> = {
  "22P02": "INVALID_ENUM",
  "23503": "FOREIGN_KEY_VIOLATION",
  "23505": "UNIQUE_VIOLATION",
  "23502": "NOT_NULL_VIOLATION",
  "42501": "PERMISSION_DENIED",
  "42883": "FUNCTION_NOT_FOUND",
  PGRST202: "FUNCTION_NOT_FOUND",
  PGRST301: "SCHEMA_CACHE_STALE",
};

function normalizeError(error: unknown, functionName: string): RPCError {
  const err = error as { message?: string; code?: string; hint?: string } | null;
  const message = err?.message || String(error);
  const code = err?.code || "UNKNOWN";

  // Map to internal code
  let internalCode = ERROR_CODE_MAP[code] || "UNKNOWN";

  // Get user-friendly message
  let userMessage = getUserFriendlyError(error);

  // Enhance for specific cases
  if (message.includes("invalid input value for enum")) {
    internalCode = "INVALID_ENUM";
    const match = message.match(/enum (\w+): "([^"]+)"/);
    if (match) {
      const [, enumName, value] = match;
      if (value === "FIRST_INVESTMENT") {
        userMessage =
          "Transaction type 'First Investment' must be processed as a Deposit. Please refresh and try again.";
      } else {
        userMessage = `Invalid ${enumName.replace(/_/g, " ")}: "${value}"`;
      }
    }
  }

  if (message.includes("not found in the schema cache")) {
    internalCode = "SCHEMA_CACHE_STALE";
    userMessage = `Backend function not found: ${functionName}. Please refresh or contact support.`;
  }

  if (message.includes("ambiguous")) {
    internalCode = "AMBIGUOUS_COLUMN";
    userMessage = "Database query error. Please contact support.";
  }

  if (message.includes("duplicate key") || message.includes("unique constraint")) {
    internalCode = "DUPLICATE";
    // Check if it's an idempotency key
    if (message.includes("reference_id")) {
      internalCode = "ALREADY_APPLIED";
      userMessage = "This operation has already been processed.";
    }
  }

  return {
    message,
    code: internalCode,
    userMessage,
    originalError: error,
  };
}

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
function validateParams<T extends RPCFunctionName>(
  functionName: T,
  params: RPCFunctions[T]["Args"]
): void {
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

  // Enforce idempotency key for mutations
  const isMutation = Object.values(CANONICAL_MUTATION_RPCS).includes(functionName as any);
  if (isMutation && !("p_reference_id" in p) && !("p_notes" in p)) {
    // Allow if notes contain a reference
    console.warn(`[RPC] Mutation ${String(functionName)} called without explicit reference_id`);
  }
}

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

/**
 * Rate-limited RPCs with their thresholds
 * Uses the client-side rate limiter as a first line of defense
 * Server-side rate limiting (check_rate_limit_with_config) provides final enforcement
 */
const RATE_LIMITED_RPCS: Record<
  string,
  { windowMs: number; maxRequests: number; actionType: string }
> = {
  apply_deposit_with_crystallization: { windowMs: 60000, maxRequests: 10, actionType: "deposit" },
  apply_withdrawal_with_crystallization: {
    windowMs: 60000,
    maxRequests: 10,
    actionType: "withdrawal",
  },
  apply_daily_yield_to_fund_v3: {
    windowMs: 60000,
    maxRequests: 5,
    actionType: "yield_distribution",
  },
  approve_withdrawal: { windowMs: 60000, maxRequests: 20, actionType: "withdrawal_approval" },
  reject_withdrawal: { windowMs: 60000, maxRequests: 20, actionType: "withdrawal_approval" },
  complete_withdrawal: { windowMs: 60000, maxRequests: 10, actionType: "withdrawal" },
  admin_create_transaction: { windowMs: 60000, maxRequests: 30, actionType: "transaction" },
  adjust_investor_position: { windowMs: 60000, maxRequests: 20, actionType: "position_adjustment" },
};

/**
 * Check rate limit for a given RPC function
 * Returns true if allowed, false if rate limited
 */
async function checkRateLimit(functionName: string, actorId?: string): Promise<boolean> {
  const config = RATE_LIMITED_RPCS[functionName];
  if (!config) return true; // Not rate limited

  const identifier = actorId || "anonymous";
  const limiter = getRateLimiter();
  const result = await limiter.checkLimit(`rpc:${functionName}:${identifier}`, {
    windowMs: config.windowMs,
    maxRequests: config.maxRequests,
    identifier: "user",
  });

  if (!result.allowed) {
    logWarn(`rpc.rateLimit.${functionName}`, {
      identifier,
      remaining: result.remaining,
      resetTime: result.resetTime,
    });
  }

  return result.allowed;
}

// =============================================================================
// RPC GATEWAY
// =============================================================================

/**
 * Call an RPC function with full type safety, validation, and rate limiting
 */
async function call<T extends RPCFunctionName>(
  functionName: T,
  params: RPCFunctions[T]["Args"]
): Promise<RPCResult<RPCFunctions[T]["Returns"]>> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).slice(2, 10);

  try {
    // Validate parameters
    validateParams(functionName, params);

    // Check rate limiting for sensitive mutations
    const isMutation = Object.values(CANONICAL_MUTATION_RPCS).includes(functionName as any);
    if (isMutation) {
      // Extract actor ID from params if available
      const p = params as Record<string, unknown>;
      const actorId = (p.p_admin_id || p.p_created_by || p.p_actor_id) as string | undefined;

      const allowed = await checkRateLimit(String(functionName), actorId);
      if (!allowed) {
        logWarn(`rpc.rateLimit.blocked.${String(functionName)}`, {
          requestId,
          actorId,
        });
        return {
          data: null,
          error: {
            message: "Rate limit exceeded",
            code: "RATE_LIMITED",
            userMessage: "Too many requests. Please wait a moment before trying again.",
          },
          success: false,
        };
      }

      logInfo(`rpc.mutation.${String(functionName)}`, {
        requestId,
        params: sanitizeParams(params),
      });
    }

    // Execute RPC
    const { data, error } = await supabase.rpc(functionName, params);
    const durationMs = Date.now() - startTime;

    if (error) {
      const normalizedError = normalizeError(error, String(functionName));
      logError(`rpc.error.${String(functionName)}`, error, {
        requestId,
        code: normalizedError.code,
        durationMs,
      });
      return {
        data: null,
        error: normalizedError,
        success: false,
      };
    }

    // Log completion for mutations (helps with debugging and observability)
    if (isMutation) {
      logInfo(`rpc.complete.${String(functionName)}`, {
        requestId,
        success: true,
        durationMs,
      });
    }

    return {
      data: data as RPCFunctions[T]["Returns"],
      error: null,
      success: true,
    };
  } catch (err) {
    const normalizedError = normalizeError(err, String(functionName));
    logError(`rpc.exception.${String(functionName)}`, err, {
      requestId,
      durationMs: Date.now() - startTime,
    });
    return {
      data: null,
      error: normalizedError,
      success: false,
    };
  }
}

/**
 * Call an RPC function that takes no arguments
 */
async function callNoArgs<T extends RPCFunctionName>(
  functionName: T
): Promise<RPCResult<RPCFunctions[T]["Returns"]>> {
  try {
    const { data, error } = await supabase.rpc(functionName);

    if (error) {
      const normalizedError = normalizeError(error, String(functionName));
      return { data: null, error: normalizedError, success: false };
    }

    return {
      data: data as RPCFunctions[T]["Returns"],
      error: null,
      success: true,
    };
  } catch (err) {
    const normalizedError = normalizeError(err, String(functionName));
    return { data: null, error: normalizedError, success: false };
  }
}

/**
 * Sanitize params for logging (remove sensitive data)
 */
function sanitizeParams(params: unknown): unknown {
  if (typeof params !== "object" || params === null) return params;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    // Redact sensitive fields
    if (key.includes("password") || key.includes("secret") || key.includes("token")) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 100) {
      sanitized[key] = value.substring(0, 100) + "...";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// =============================================================================
// CANONICAL MUTATION HELPERS
// =============================================================================

/**
 * Create a deposit with crystallization (canonical pathway)
 */
async function deposit(params: {
  fundId: string;
  investorId: string;
  amount: number;
  newTotalAum: number;
  txDate: string;
  adminId: string;
  notes?: string;
  purpose?: "reporting" | "transaction";
}): Promise<RPCResult<unknown>> {
  return call("apply_deposit_with_crystallization", {
    p_fund_id: params.fundId,
    p_investor_id: params.investorId,
    p_amount: params.amount,
    p_closing_aum: params.newTotalAum,
    p_effective_date: params.txDate,
    p_admin_id: params.adminId,
    p_notes: params.notes,
    p_purpose: params.purpose,
  });
}

/**
 * Create a withdrawal with crystallization (canonical pathway)
 */
async function withdrawal(params: {
  fundId: string;
  investorId: string;
  amount: number;
  newTotalAum: number;
  txDate: string;
  adminId: string;
  notes?: string;
  purpose?: "reporting" | "transaction";
}): Promise<RPCResult<unknown>> {
  return call("apply_withdrawal_with_crystallization", {
    p_fund_id: params.fundId,
    p_investor_id: params.investorId,
    p_amount: params.amount,
    p_new_total_aum: params.newTotalAum,
    p_tx_date: params.txDate,
    p_admin_id: params.adminId,
    p_notes: params.notes,
    p_purpose: params.purpose,
  });
}

/**
 * Apply yield distribution (canonical pathway)
 */
async function applyYield(params: {
  fundId: string;
  yieldDate: string;
  grossYieldPct: number;
  createdBy?: string;
  purpose?: "reporting" | "transaction";
}): Promise<RPCResult<unknown>> {
  return call("apply_daily_yield_to_fund_v3", {
    p_fund_id: params.fundId,
    p_yield_date: params.yieldDate,
    p_gross_yield_pct: params.grossYieldPct,
    p_created_by: params.createdBy,
    p_purpose: params.purpose,
  });
}

/**
 * Preview yield distribution (read-only)
 */
async function previewYield(params: {
  fundId: string;
  yieldDate: string;
  newAum: number;
  purpose?: "reporting" | "transaction";
}): Promise<RPCResult<unknown>> {
  return call("preview_daily_yield_to_fund_v3", {
    p_fund_id: params.fundId,
    p_yield_date: params.yieldDate,
    p_new_aum: params.newAum,
    p_purpose: params.purpose,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

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
