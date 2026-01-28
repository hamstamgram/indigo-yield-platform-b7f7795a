import { RPCError } from "./types";
import { getUserFriendlyError } from "@/lib/errors";

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

export function normalizeError(error: unknown, functionName: string): RPCError {
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
