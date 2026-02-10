import { supabase } from "@/integrations/supabase/client";
import { getRateLimiter } from "@/lib/security/rateLimiter";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { CANONICAL_MUTATION_RPCS } from "@/contracts/rpcSignatures";

import { RPCResult, RPCFunctions, RPCFunctionName } from "./types";
import { normalizeError } from "./normalization";
import { validateParams } from "./validation";

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

const RATE_LIMITED_RPCS: Record<
  string,
  { windowMs: number; maxRequests: number; actionType: string }
> = {
  apply_transaction_with_crystallization: {
    windowMs: 60000,
    maxRequests: 10,
    actionType: "transaction",
  },
  apply_adb_yield_distribution_v4: {
    windowMs: 60000,
    maxRequests: 5,
    actionType: "yield_distribution",
  },
  approve_withdrawal: { windowMs: 60000, maxRequests: 20, actionType: "withdrawal_approval" },
  approve_and_complete_withdrawal: { windowMs: 60000, maxRequests: 10, actionType: "withdrawal" },
  reject_withdrawal: { windowMs: 60000, maxRequests: 20, actionType: "withdrawal_approval" },
  complete_withdrawal: { windowMs: 60000, maxRequests: 10, actionType: "withdrawal" },

  adjust_investor_position: { windowMs: 60000, maxRequests: 20, actionType: "position_adjustment" },
  void_transaction: { windowMs: 60000, maxRequests: 10, actionType: "void" },
  void_yield_distribution: { windowMs: 60000, maxRequests: 5, actionType: "void" },
  edit_transaction: { windowMs: 60000, maxRequests: 20, actionType: "transaction" },
  set_fund_daily_aum: { windowMs: 60000, maxRequests: 30, actionType: "aum" },
  batch_crystallize_fund: { windowMs: 60000, maxRequests: 10, actionType: "crystallization" },
};

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

/**
 * Call an RPC function with full type safety, validation, and rate limiting
 */
export async function call<T extends RPCFunctionName>(
  functionName: T,
  params: RPCFunctions[T]["Args"]
): Promise<RPCResult<RPCFunctions[T]["Returns"]>> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).slice(2, 10);

  try {
    // Validate parameters
    validateParams(functionName, params);

    // Check rate limiting for sensitive mutations
    const isMutation = (Object.values(CANONICAL_MUTATION_RPCS) as string[]).includes(
      String(functionName)
    );
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
export async function callNoArgs<T extends RPCFunctionName>(
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

// =============================================================================
// CANONICAL MUTATION HELPERS
// =============================================================================

export async function deposit(params: {
  fundId: string;
  investorId: string;
  /** Amount as string for NUMERIC precision */
  amount: string;
  /** Closing AUM as string for NUMERIC precision */
  closingAum: string;
  txDate: string;
  adminId: string;
  referenceId: string;
  notes?: string;
  purpose?: "reporting" | "transaction";
}): Promise<RPCResult<unknown>> {
  return call("apply_transaction_with_crystallization", {
    p_fund_id: params.fundId,
    p_investor_id: params.investorId,
    p_tx_type: "DEPOSIT",
    p_amount: Number(params.amount),
    p_tx_date: params.txDate,
    p_reference_id: params.referenceId,
    p_new_total_aum: Number(params.closingAum),
    p_admin_id: params.adminId,
    p_notes: params.notes,
    p_purpose: params.purpose,
  });
}

export async function withdrawal(params: {
  fundId: string;
  investorId: string;
  /** Amount as string for NUMERIC precision */
  amount: string;
  /** New total AUM as string for NUMERIC precision */
  newTotalAum: string;
  txDate: string;
  adminId: string;
  referenceId: string;
  notes?: string;
  purpose?: "reporting" | "transaction";
}): Promise<RPCResult<unknown>> {
  return call("apply_transaction_with_crystallization", {
    p_fund_id: params.fundId,
    p_investor_id: params.investorId,
    p_tx_type: "WITHDRAWAL",
    p_amount: Number(params.amount),
    p_tx_date: params.txDate,
    p_reference_id: params.referenceId,
    p_new_total_aum: Number(params.newTotalAum),
    p_admin_id: params.adminId,
    p_notes: params.notes,
    p_purpose: params.purpose,
  });
}

export async function applyYield(params: {
  fundId: string;
  periodStart: string;
  periodEnd: string;
  /** Gross yield amount as string for NUMERIC precision */
  grossYieldAmount: string;
  adminId: string;
  purpose?: "reporting" | "transaction";
  /** Recorded AUM as string for NUMERIC precision */
  recordedAum?: string;
}): Promise<RPCResult<unknown>> {
  return call("apply_adb_yield_distribution_v4", {
    p_fund_id: params.fundId,
    p_period_start: params.periodStart,
    p_period_end: params.periodEnd,
    p_gross_yield_amount: Number(params.grossYieldAmount),
    p_admin_id: params.adminId,
    p_purpose: params.purpose,
    ...(params.recordedAum != null && { p_recorded_aum: Number(params.recordedAum) }),
  });
}

export async function previewYield(params: {
  fundId: string;
  periodStart: string;
  periodEnd: string;
  /** Gross yield amount as string for NUMERIC precision */
  grossYieldAmount: string;
  purpose?: "reporting" | "transaction";
}): Promise<RPCResult<unknown>> {
  return call("preview_adb_yield_distribution_v4", {
    p_fund_id: params.fundId,
    p_period_start: params.periodStart,
    p_period_end: params.periodEnd,
    p_gross_yield_amount: Number(params.grossYieldAmount),
    p_purpose: params.purpose,
  });
}
