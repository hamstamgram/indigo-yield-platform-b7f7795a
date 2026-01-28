import { DBError } from "./types";
import { getUserFriendlyError } from "@/lib/errors";

// =============================================================================
// ERROR NORMALIZATION
// =============================================================================

export function normalizeError(error: unknown, context: string): DBError {
  const err = error as { message?: string; code?: string } | null;
  const message = err?.message || String(error);
  const code = err?.code || "UNKNOWN";

  let userMessage = getUserFriendlyError(error);
  let internalCode = code;

  if (message.includes("ambiguous")) {
    internalCode = "AMBIGUOUS_COLUMN";
    userMessage = "Database query error (ambiguous column). Please contact support.";
  }

  if (message.includes("does not exist")) {
    internalCode = "COLUMN_NOT_FOUND";
    userMessage = "Database schema mismatch. Please refresh or contact support.";
  }

  return {
    message,
    code: internalCode,
    userMessage,
    originalError: error,
  };
}
