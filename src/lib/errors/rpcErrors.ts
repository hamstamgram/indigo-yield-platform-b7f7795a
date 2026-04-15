/**
 * RPC Error Handler
 * Provides user-friendly error messages for database RPC errors
 */

import { logError } from "@/lib/logger";

/**
 * Known error patterns and their user-friendly messages
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  message: (match: RegExpMatchArray) => string;
}> = [
  // Enum mismatch errors
  {
    pattern: /invalid input value for enum (\w+): "([^"]+)"/i,
    message: (match) => {
      const [, enumName, invalidValue] = match;
      if (enumName === "tx_type" && invalidValue === "FIRST_INVESTMENT") {
        return "Transaction type error: 'First Investment' should be processed as a regular deposit. Please refresh and try again.";
      }
      return `Invalid ${enumName.replace(/_/g, " ")}: "${invalidValue}". Please contact support if this persists.`;
    },
  },

  // Foreign key violations
  {
    pattern: /violates foreign key constraint.*"(\w+)"/i,
    message: (match) => {
      const [, constraint] = match;
      if (constraint.includes("investor")) {
        return "This investor cannot be deleted because they have associated records (e.g., transactions, documents). Use Force Delete if necessary.";
      }
      if (constraint.includes("fund")) {
        return "Fund not found. The fund may have been deactivated or doesn't exist.";
      }
      return "Referenced record not found. Please refresh and try again.";
    },
  },

  // Unique constraint violations
  {
    pattern: /duplicate key value violates unique constraint.*"(\w+)"/i,
    message: (match) => {
      const [, constraint] = match;
      if (constraint.includes("reference")) {
        return "This transaction has already been processed (duplicate reference ID).";
      }
      if (constraint.includes("position")) {
        return "Position already exists for this investor and fund.";
      }
      return "A record with this information already exists.";
    },
  },

  // Not null violations
  {
    pattern: /null value in column "(\w+)" .* not-null constraint/i,
    message: (match) => {
      const [, column] = match;
      const fieldName = column.replace(/_/g, " ");
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required.`;
    },
  },

  // Custom application errors from stored procedures
  {
    pattern: /First Investment only allowed when balance is 0/i,
    message: () =>
      "This investor already has a balance. Use 'Deposit' instead of 'First Investment'.",
  },
  {
    pattern: /Top-up not allowed when balance is 0/i,
    message: () =>
      "This investor has no existing balance. Use 'First Investment' for their initial deposit.",
  },
  {
    pattern: /AUM missing for fund/i,
    message: () =>
      "No AUM record exists for this fund on the selected date. Please record the fund AUM first.",
  },
  {
    pattern: /Insufficient balance/i,
    message: () =>
      "Insufficient balance for this withdrawal. The withdrawal amount exceeds the available balance.",
  },
  {
    pattern: /Transaction already voided/i,
    message: () => "This transaction has already been voided and cannot be modified.",
  },
  {
    pattern: /Cannot void.*locked/i,
    message: () => "This transaction is locked and cannot be voided. Contact an administrator.",
  },
  {
    pattern: /FIRST PRINCIPLES VIOLATION/i,
    message: () =>
      "Cannot void this transaction because a subsequent yield distribution depends on it. Void the yield distribution first, then void this transaction.",
  },

  // Permission errors
  {
    pattern: /permission denied|insufficient privilege/i,
    message: () =>
      "You don't have permission to perform this action. Please contact an administrator.",
  },

  // RPC function not found (schema cache stale or function missing)
  {
    pattern: /not found in the schema cache|could not find the function/i,
    message: () =>
      "This operation is not available yet. Please refresh the page and try again, or contact support.",
  },

  // RPC parameter mismatch
  {
    pattern: /could not find the function.*with the specified parameters/i,
    message: () =>
      "Operation parameter mismatch. Please refresh the page and try again. If this persists, contact support.",
  },

  // Void-related errors from DB
  {
    pattern: /already voided/i,
    message: () => "This transaction has already been voided and cannot be modified.",
  },
  {
    pattern: /cannot void.*locked/i,
    message: () => "This transaction is locked and cannot be voided. Contact an administrator.",
  },
  {
    pattern: /first principles violation/i,
    message: () =>
      "Cannot void this transaction because a subsequent yield distribution depends on it. Void the yield distribution first, then void this transaction.",
  },
  {
    pattern: /transaction not found/i,
    message: () => "Transaction not found. It may have been deleted. Please refresh and try again.",
  },

  // Connection/timeout errors
  {
    pattern: /connection.*timeout|statement timeout/i,
    message: () =>
      "The operation timed out. Please try again. If the problem persists, contact support.",
  },
];

/**
 * Parse an RPC error and return a user-friendly message
 */
export function getUserFriendlyError(error: Error | unknown): string {
  const errorMessage =
    error instanceof Error
      ? error.message
      : error !== null &&
          typeof error === "object" &&
          "message" in error &&
          typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : String(error);

  // Check against known patterns
  for (const { pattern, message } of ERROR_PATTERNS) {
    const match = errorMessage.match(pattern);
    if (match) {
      return message(match);
    }
  }

  // Generic fallback with sanitization
  if (errorMessage.includes("PGRST") || errorMessage.includes("42")) {
    return "A database error occurred. Please try again or contact support.";
  }

  // Return original if it's already user-friendly (doesn't contain technical details)
  if (
    !errorMessage.includes("constraint") &&
    !errorMessage.includes("relation") &&
    !errorMessage.includes("PGRST") &&
    errorMessage.length < 200
  ) {
    return errorMessage;
  }

  return "An unexpected error occurred. Please try again or contact support.";
}

/**
 * Type guard to check if an error is a Supabase RPC error
 */
export function isRPCError(error: unknown): error is { message: string; code?: string } {
  return (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

/**
 * Create a toast-friendly error result
 */
export interface ToastError {
  title: string;
  description: string;
  variant: "destructive" | "default";
}

export function createToastError(error: Error | unknown): ToastError {
  const message = getUserFriendlyError(error);

  return {
    title: "Error",
    description: message,
    variant: "destructive",
  };
}

/**
 * Log error with context while returning user-friendly message
 */
export function handleRPCError(
  error: Error | unknown,
  context: string,
  logger?: (msg: string, error: unknown, meta?: object) => void
): string {
  const userMessage = getUserFriendlyError(error);

  // Log the full technical error for debugging
  if (logger) {
    logger(context, error, {
      userMessage,
      originalError:
        error instanceof Error
          ? error.message
          : error !== null && typeof error === "object" && "message" in error
            ? (error as { message: string }).message
            : String(error),
    });
  } else {
    logError(context, error, {
      userMessage,
      originalError:
        error instanceof Error
          ? error.message
          : error !== null && typeof error === "object" && "message" in error
            ? (error as { message: string }).message
            : String(error),
    });
  }

  return userMessage;
}
