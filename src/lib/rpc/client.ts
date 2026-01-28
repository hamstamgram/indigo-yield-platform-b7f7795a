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

export async function withdrawal(params: {
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

export async function applyYield(params: {
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

export async function previewYield(params: {
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
