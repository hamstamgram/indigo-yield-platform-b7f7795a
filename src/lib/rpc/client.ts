import { supabase } from "@/integrations/supabase/client";
import { getRateLimiter } from "@/lib/security/rateLimiter";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { CANONICAL_MUTATION_RPCS } from "@/contracts/rpcSignatures";

import { RPCResult, RPCFunctions, RPCFunctionName } from "./types";
import { normalizeError } from "./normalization";
import { validateParams } from "./validation";

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_ERROR_CODES = [
  "NETWORK_ERROR",
  "TIMEOUT",
  "SERVER_ERROR",
  "SERVICE_UNAVAILABLE",
  "BAD_GATEWAY",
  "GATEWAY_TIMEOUT",
];

function isRetryableError(error: { code?: string; message?: string }): boolean {
  const code = error.code?.toUpperCase() || "";
  const message = error.message?.toUpperCase() || "";
  return (
    RETRYABLE_ERROR_CODES.some(
      (c) => code.includes(c) || message.includes(c)
    ) || code === "500" || code === "502" || code === "503" || code === "504"
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  apply_segmented_yield_distribution_v5: {
    windowMs: 60000,
    maxRequests: 5,
    actionType: "yield_distribution",
  },
  approve_and_complete_withdrawal: { windowMs: 60000, maxRequests: 10, actionType: "withdrawal" },
  reject_withdrawal: { windowMs: 60000, maxRequests: 20, actionType: "withdrawal_approval" },

  adjust_investor_position: { windowMs: 60000, maxRequests: 20, actionType: "position_adjustment" },
  void_transaction: { windowMs: 60000, maxRequests: 10, actionType: "void" },
  void_yield_distribution: { windowMs: 60000, maxRequests: 5, actionType: "void" },
  edit_transaction: { windowMs: 60000, maxRequests: 20, actionType: "transaction" },
  set_fund_daily_aum: { windowMs: 60000, maxRequests: 30, actionType: "aum" },
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
 * Call an RPC function with full type safety, validation, rate limiting, and retry logic
 */
export async function call<T extends RPCFunctionName>(
  functionName: T,
  params: RPCFunctions[T]["Args"]
): Promise<RPCResult<RPCFunctions[T]["Returns"]>> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).slice(2, 10);

  let lastError: { code?: string; message?: string } | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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

      // Execute RPC — cast required because RPCFunctions extends Database["public"]["Functions"]
      // with additional functions that exist in production but aren't in generated types yet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc(functionName as any, params as any);
      const durationMs = Date.now() - startTime;

      if (error) {
        console.error(
          `[RPC_ERROR] ${String(functionName)} attempt ${attempt}/${MAX_RETRIES} failed.`,
          JSON.stringify(error)
        );
        const normalizedError = normalizeError(error, String(functionName));
        lastError = { code: normalizedError.code, message: normalizedError.message };

        // If retryable and not last attempt, retry
        if (isRetryableError(error) && attempt < MAX_RETRIES) {
          logWarn(`rpc.retry.${String(functionName)}`, {
            requestId,
            attempt,
            maxRetries: MAX_RETRIES,
            error: normalizedError.code,
          });
          await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
          continue;
        }

        logError(`rpc.error.${String(functionName)}`, error, {
          requestId,
          code: normalizedError.code,
          durationMs,
          attempts: attempt,
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
          attempts: attempt,
        });
      }

      return {
        data: data as RPCFunctions[T]["Returns"],
        error: null,
        success: true,
      };
    } catch (err) {
      const normalizedError = normalizeError(err, String(functionName));
      lastError = { code: normalizedError.code, message: normalizedError.message };

      // Retry on catchable errors
      if (isRetryableError(normalizedError) && attempt < MAX_RETRIES) {
        logWarn(`rpc.retry.exception.${String(functionName)}`, {
          requestId,
          attempt,
          maxRetries: MAX_RETRIES,
        });
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      logError(`rpc.exception.${String(functionName)}`, err, {
        requestId,
        durationMs: Date.now() - startTime,
        attempts: attempt,
      });
      return {
        data: null,
        error: normalizedError,
        success: false,
      };
    }
  }

  // Should never reach here, but handle case where all retries exhausted
  return {
    data: null,
    error: {
      code: "RETRY_EXHAUSTED",
      message: lastError?.message || "All retry attempts failed",
      userMessage: "An unexpected error occurred. Please try again.",
    },
    success: false,
  };
}

/**
 * Call an RPC function that takes no arguments
 */
export async function callNoArgs<T extends RPCFunctionName>(
  functionName: T
): Promise<RPCResult<RPCFunctions[T]["Returns"]>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc(functionName as any);

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

export async function applyYield(params: {
  fundId: string;
  periodEnd: string;
  /** Recorded AUM as string for NUMERIC precision */
  recordedAum: string;
  adminId: string;
  purpose: "reporting" | "transaction";
  openingAum?: string;
  distributionDate?: string;
}): Promise<RPCResult<unknown>> {
  return call("apply_segmented_yield_distribution_v5" as RPCFunctionName, {
    p_fund_id: params.fundId,
    p_period_end: params.periodEnd,
    p_recorded_aum: params.recordedAum as unknown as number,
    p_admin_id: params.adminId,
    p_purpose: params.purpose,
    p_opening_aum: params.openingAum ? (params.openingAum as unknown as number) : undefined,
    p_distribution_date: params.distributionDate,
  } as any);
}
