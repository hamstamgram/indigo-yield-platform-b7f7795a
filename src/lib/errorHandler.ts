/**
 * Centralized Error Handler
 *
 * Provides consistent error handling across the application:
 * - Structured error types
 * - User-friendly messages
 * - Logging with context
 * - Toast notifications
 */

import { toast } from "sonner";

// ============================================================================
// Error Types
// ============================================================================

export enum ErrorCode {
  // Authentication
  AUTH_REQUIRED = "AUTH_REQUIRED",
  AUTH_EXPIRED = "AUTH_EXPIRED",
  AUTH_FORBIDDEN = "AUTH_FORBIDDEN",

  // Validation
  VALIDATION_FAILED = "VALIDATION_FAILED",
  INVALID_INPUT = "INVALID_INPUT",

  // Database/RPC
  RPC_ERROR = "RPC_ERROR",
  DB_ERROR = "DB_ERROR",
  NOT_FOUND = "NOT_FOUND",
  DUPLICATE = "DUPLICATE",

  // Business Logic
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  PERIOD_LOCKED = "PERIOD_LOCKED",

  // Network
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",

  // Generic
  UNKNOWN = "UNKNOWN",
}

export interface AppError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  context?: Record<string, unknown>;
  originalError?: unknown;
}

// ============================================================================
// Error Creation
// ============================================================================

/**
 * Create a structured AppError
 */
export function createAppError(
  code: ErrorCode,
  message: string,
  userMessage?: string,
  context?: Record<string, unknown>,
  originalError?: unknown
): AppError {
  return {
    code,
    message,
    userMessage: userMessage || getDefaultUserMessage(code),
    context,
    originalError,
  };
}

/**
 * Get default user-friendly message for error code
 */
function getDefaultUserMessage(code: ErrorCode): string {
  switch (code) {
    case ErrorCode.AUTH_REQUIRED:
      return "Please log in to continue.";
    case ErrorCode.AUTH_EXPIRED:
      return "Your session has expired. Please log in again.";
    case ErrorCode.AUTH_FORBIDDEN:
      return "You don't have permission to perform this action.";
    case ErrorCode.VALIDATION_FAILED:
    case ErrorCode.INVALID_INPUT:
      return "Please check your input and try again.";
    case ErrorCode.NOT_FOUND:
      return "The requested item was not found.";
    case ErrorCode.DUPLICATE:
      return "This item already exists.";
    case ErrorCode.BUSINESS_RULE_VIOLATION:
      return "This action cannot be completed due to business rules.";
    case ErrorCode.INSUFFICIENT_BALANCE:
      return "Insufficient balance for this operation.";
    case ErrorCode.PERIOD_LOCKED:
      return "This period is locked and cannot be modified.";
    case ErrorCode.NETWORK_ERROR:
      return "Network error. Please check your connection.";
    case ErrorCode.TIMEOUT:
      return "Request timed out. Please try again.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}

// ============================================================================
// Error Parsing
// ============================================================================

/**
 * Parse unknown error into AppError
 */
export function parseError(error: unknown, context?: Record<string, unknown>): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return { ...error, context: { ...error.context, ...context } };
  }

  // Supabase/PostgreSQL error
  if (isSupabaseError(error)) {
    return parseSupabaseError(error, context);
  }

  // Standard Error
  if (error instanceof Error) {
    return createAppError(
      ErrorCode.UNKNOWN,
      error.message,
      error.message,
      context,
      error
    );
  }

  // String error
  if (typeof error === "string") {
    return createAppError(ErrorCode.UNKNOWN, error, error, context);
  }

  // Unknown
  return createAppError(
    ErrorCode.UNKNOWN,
    "Unknown error",
    undefined,
    context,
    error
  );
}

/**
 * Check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "userMessage" in error
  );
}

/**
 * Check if error is from Supabase
 */
function isSupabaseError(error: unknown): error is { message: string; code?: string; details?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

/**
 * Parse Supabase/PostgreSQL errors
 */
function parseSupabaseError(
  error: { message: string; code?: string; details?: string },
  context?: Record<string, unknown>
): AppError {
  const message = error.message || "Database error";
  const pgCode = error.code;

  // Map PostgreSQL error codes
  if (pgCode === "23505") {
    return createAppError(ErrorCode.DUPLICATE, message, "This record already exists.", context, error);
  }
  if (pgCode === "23503") {
    return createAppError(ErrorCode.NOT_FOUND, message, "Referenced record not found.", context, error);
  }
  if (pgCode === "42501" || message.includes("permission denied") || message.includes("policy")) {
    return createAppError(ErrorCode.AUTH_FORBIDDEN, message, "You don't have permission for this action.", context, error);
  }
  if (message.includes("Admin only") || message.includes("admin privileges")) {
    return createAppError(ErrorCode.AUTH_FORBIDDEN, message, "Admin access required.", context, error);
  }
  if (message.includes("locked") || message.includes("already applied")) {
    return createAppError(ErrorCode.PERIOD_LOCKED, message, "This period is locked and cannot be modified.", context, error);
  }
  if (message.includes("insufficient") || message.includes("negative")) {
    return createAppError(ErrorCode.INSUFFICIENT_BALANCE, message, "Insufficient balance for this operation.", context, error);
  }

  return createAppError(ErrorCode.DB_ERROR, message, message, context, error);
}

// ============================================================================
// Error Handling
// ============================================================================

export interface HandleErrorOptions {
  /** Show toast notification to user */
  showToast?: boolean;
  /** Log to console */
  log?: boolean;
  /** Re-throw after handling */
  rethrow?: boolean;
  /** Custom user message override */
  userMessage?: string;
  /** Additional context for logging */
  context?: Record<string, unknown>;
}

const defaultOptions: HandleErrorOptions = {
  showToast: true,
  log: true,
  rethrow: false,
};

/**
 * Handle an error with consistent behavior
 */
export function handleError(
  error: unknown,
  operation: string,
  options: HandleErrorOptions = {}
): AppError {
  const opts = { ...defaultOptions, ...options };
  const appError = parseError(error, { operation, ...opts.context });

  // Override user message if provided
  if (opts.userMessage) {
    appError.userMessage = opts.userMessage;
  }

  // Log to console
  if (opts.log) {
    console.error(`[${operation}]`, appError.message, {
      code: appError.code,
      context: appError.context,
      originalError: appError.originalError,
    });
  }

  // Show toast notification
  if (opts.showToast) {
    toast.error(appError.userMessage);
  }

  // Re-throw if requested
  if (opts.rethrow) {
    throw appError;
  }

  return appError;
}

/**
 * Handle error in async function with consistent pattern
 */
export async function withErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
  options: HandleErrorOptions = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, operation, { ...options, rethrow: true });
    throw error; // TypeScript needs this
  }
}

// ============================================================================
// Service Error Helpers
// ============================================================================

/**
 * Create a service error handler for consistent service-level error handling
 */
export function createServiceErrorHandler(serviceName: string) {
  return {
    handle: (error: unknown, operation: string, options?: HandleErrorOptions) =>
      handleError(error, `${serviceName}.${operation}`, options),

    wrap: <T>(operation: string, fn: () => Promise<T>, options?: HandleErrorOptions) =>
      withErrorHandling(`${serviceName}.${operation}`, fn, options),
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  createAppError,
  parseError,
  handleError,
  withErrorHandling,
  createServiceErrorHandler,
  ErrorCode,
};
