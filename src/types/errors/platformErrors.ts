/**
 * Platform Error Types - Typed Error Contract
 *
 * This file defines the error codes, categories, and response types
 * that match the database error_code_metadata table.
 *
 * @see supabase/migrations/20260114190000_typed_error_contract.sql
 */

// ============================================================================
// ERROR CODE ENUM
// ============================================================================

/**
 * Platform error codes - must match database platform_error_code enum
 */
export enum PlatformErrorCode {
  // AUM & Preflow Errors
  PREFLOW_AUM_MISSING = "PREFLOW_AUM_MISSING",
  AUM_NOT_FOUND = "AUM_NOT_FOUND",
  AUM_ALREADY_EXISTS = "AUM_ALREADY_EXISTS",
  AUM_DUPLICATE_PREFLOW = "AUM_DUPLICATE_PREFLOW",

  // Period & Date Errors
  PERIOD_LOCKED = "PERIOD_LOCKED",
  PERIOD_NOT_FOUND = "PERIOD_NOT_FOUND",
  ECONOMIC_DATE_REQUIRED = "ECONOMIC_DATE_REQUIRED",
  FUTURE_DATE_NOT_ALLOWED = "FUTURE_DATE_NOT_ALLOWED",
  BACKDATED_NOT_ALLOWED = "BACKDATED_NOT_ALLOWED",

  // Ledger & Transaction Errors
  LEDGER_IMMUTABLE = "LEDGER_IMMUTABLE",
  TRANSACTION_NOT_FOUND = "TRANSACTION_NOT_FOUND",
  TRANSACTION_ALREADY_VOIDED = "TRANSACTION_ALREADY_VOIDED",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  INVALID_TRANSACTION_TYPE = "INVALID_TRANSACTION_TYPE",

  // Asset & Currency Errors
  ASSET_MISMATCH = "ASSET_MISMATCH",
  INVALID_ASSET = "INVALID_ASSET",

  // Yield & Distribution Errors
  YIELD_CONSERVATION_VIOLATION = "YIELD_CONSERVATION_VIOLATION",
  DUST_TOLERANCE_EXCEEDED = "DUST_TOLERANCE_EXCEEDED",
  NO_POSITIONS_FOR_YIELD = "NO_POSITIONS_FOR_YIELD",

  // Fund Errors
  FUND_NOT_FOUND = "FUND_NOT_FOUND",
  FUND_INACTIVE = "FUND_INACTIVE",

  // Investor Errors
  INVESTOR_NOT_FOUND = "INVESTOR_NOT_FOUND",
  INVESTOR_POSITION_NOT_FOUND = "INVESTOR_POSITION_NOT_FOUND",
  INVESTOR_NOT_IN_FUND = "INVESTOR_NOT_IN_FUND",

  // Approval & Permission Errors
  APPROVAL_REQUIRED = "APPROVAL_REQUIRED",
  APPROVAL_PENDING = "APPROVAL_PENDING",
  SELF_APPROVAL_NOT_ALLOWED = "SELF_APPROVAL_NOT_ALLOWED",
  UNAUTHORIZED = "UNAUTHORIZED",
  ADMIN_REQUIRED = "ADMIN_REQUIRED",

  // Validation Errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  INVALID_DATE = "INVALID_DATE",
  INVALID_PURPOSE = "INVALID_PURPOSE",

  // System Errors
  SYSTEM_ERROR = "SYSTEM_ERROR",
  INVARIANT_VIOLATION = "INVARIANT_VIOLATION",
  CONCURRENCY_ERROR = "CONCURRENCY_ERROR",

  // Staging & Import Errors
  STAGING_VALIDATION_FAILED = "STAGING_VALIDATION_FAILED",
  STAGING_BATCH_NOT_FOUND = "STAGING_BATCH_NOT_FOUND",
  STAGING_ALREADY_PROMOTED = "STAGING_ALREADY_PROMOTED",
}

// ============================================================================
// ERROR CATEGORY ENUM
// ============================================================================

/**
 * Error categories for UI handling logic
 */
export enum ErrorCategory {
  VALIDATION = "VALIDATION", // Input validation errors (user can fix)
  BUSINESS_RULE = "BUSINESS_RULE", // Business logic violations
  STATE = "STATE", // Invalid state for operation
  PERMISSION = "PERMISSION", // Authorization errors
  NOT_FOUND = "NOT_FOUND", // Resource not found
  CONFLICT = "CONFLICT", // Concurrency/duplicate errors
  SYSTEM = "SYSTEM", // Internal system errors
}

// ============================================================================
// UI ACTION ENUM
// ============================================================================

/**
 * Suggested UI actions for error handling
 */
export enum ErrorUIAction {
  SHOW_ERROR = "SHOW_ERROR",
  OPEN_PREFLOW_AUM_MODAL = "OPEN_PREFLOW_AUM_MODAL",
  SHOW_UNLOCK_REQUEST = "SHOW_UNLOCK_REQUEST",
  FOCUS_DATE_FIELD = "FOCUS_DATE_FIELD",
  SHOW_VOID_REISSUE_OPTION = "SHOW_VOID_REISSUE_OPTION",
  SHOW_VOIDED_STATUS = "SHOW_VOIDED_STATUS",
  SHOW_BALANCE_INFO = "SHOW_BALANCE_INFO",
  LOCK_ASSET_FIELD = "LOCK_ASSET_FIELD",
  SHOW_EXISTING_AUM = "SHOW_EXISTING_AUM",
  SHOW_APPROVAL_REQUEST = "SHOW_APPROVAL_REQUEST",
  SHOW_PENDING_STATUS = "SHOW_PENDING_STATUS",
  SHOW_FIELD_ERRORS = "SHOW_FIELD_ERRORS",
  FOCUS_FIRST_ERROR = "FOCUS_FIRST_ERROR",
  FOCUS_AMOUNT_FIELD = "FOCUS_AMOUNT_FIELD",
  REFRESH_AND_RETRY = "REFRESH_AND_RETRY",
  SHOW_STAGING_ERRORS = "SHOW_STAGING_ERRORS",
}

// ============================================================================
// ERROR SEVERITY
// ============================================================================

export type ErrorSeverity = "warning" | "error" | "critical";

// ============================================================================
// TYPED ERROR RESPONSE
// ============================================================================

/**
 * Structured error object from RPC functions
 */
export interface PlatformError {
  code: PlatformErrorCode | string;
  category: ErrorCategory | string;
  message: string;
  user_action_hint?: string;
  ui_action?: ErrorUIAction | string;
  severity: ErrorSeverity;
  is_retryable: boolean;
  details?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * RPC response wrapper - matches build_error_response / build_success_response
 */
export interface RpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: PlatformError;
  timestamp?: string;
}

// ============================================================================
// ERROR PARSING
// ============================================================================

/**
 * Parse a raw Supabase error into a typed PlatformError
 */
export function parsePlatformError(error: unknown): PlatformError {
  // Handle null/undefined
  if (!error) {
    return createSystemError("Unknown error occurred");
  }

  // Handle Error objects
  if (error instanceof Error) {
    return parseErrorMessage(error.message);
  }

  // Handle Supabase-style error objects
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;

    // Check for RPC response format
    if (errorObj.error && typeof errorObj.error === "object") {
      const rpcError = errorObj.error as Record<string, unknown>;
      return {
        code: (rpcError.code as string) || PlatformErrorCode.SYSTEM_ERROR,
        category: (rpcError.category as string) || ErrorCategory.SYSTEM,
        message: (rpcError.message as string) || "Unknown error",
        user_action_hint: rpcError.user_action_hint as string | undefined,
        ui_action: rpcError.ui_action as string | undefined,
        severity: (rpcError.severity as ErrorSeverity) || "error",
        is_retryable: (rpcError.is_retryable as boolean) || false,
        details: rpcError.details as Record<string, unknown> | undefined,
        timestamp: rpcError.timestamp as string | undefined,
      };
    }

    // Check for direct error message
    if (errorObj.message && typeof errorObj.message === "string") {
      return parseErrorMessage(errorObj.message);
    }
  }

  // Fallback for string errors
  if (typeof error === "string") {
    return parseErrorMessage(error);
  }

  return createSystemError("Unknown error occurred");
}

/**
 * Parse structured error message format: CODE|CATEGORY|MESSAGE|DETAILS
 */
function parseErrorMessage(message: string): PlatformError {
  const parts = message.split("|");

  if (parts.length >= 3) {
    const code = parts[0] as PlatformErrorCode;
    const category = parts[1] as ErrorCategory;
    const errorMessage = parts[2];
    let details: Record<string, unknown> | undefined;

    if (parts.length >= 4) {
      try {
        details = JSON.parse(parts[3]);
      } catch {
        // Ignore parse errors
      }
    }

    // Look up metadata for this error code
    const metadata = ERROR_CODE_METADATA[code];

    return {
      code,
      category,
      message: errorMessage,
      user_action_hint: metadata?.user_action_hint,
      ui_action: metadata?.ui_action,
      severity: metadata?.severity || "error",
      is_retryable: metadata?.is_retryable || false,
      details,
    };
  }

  // Not a structured error - try to match known patterns
  return matchKnownErrorPatterns(message);
}

/**
 * Match unstructured error messages to known patterns
 */
function matchKnownErrorPatterns(message: string): PlatformError {
  const lowerMessage = message.toLowerCase();

  // Preflow AUM missing
  if (
    lowerMessage.includes("no preflow") ||
    lowerMessage.includes("preflow_aum_missing") ||
    lowerMessage.includes("no transaction-purpose aum")
  ) {
    return createError(PlatformErrorCode.PREFLOW_AUM_MISSING, message);
  }

  // Period locked
  if (lowerMessage.includes("period is locked") || lowerMessage.includes("locked period")) {
    return createError(PlatformErrorCode.PERIOD_LOCKED, message);
  }

  // Economic date required
  if (
    lowerMessage.includes("tx_date") ||
    lowerMessage.includes("economic date") ||
    lowerMessage.includes("date is required")
  ) {
    return createError(PlatformErrorCode.ECONOMIC_DATE_REQUIRED, message);
  }

  // Insufficient balance
  if (lowerMessage.includes("insufficient balance") || lowerMessage.includes("negative balance")) {
    return createError(PlatformErrorCode.INSUFFICIENT_BALANCE, message);
  }

  // Asset mismatch
  if (lowerMessage.includes("asset must match") || lowerMessage.includes("asset mismatch")) {
    return createError(PlatformErrorCode.ASSET_MISMATCH, message);
  }

  // Not found errors
  if (lowerMessage.includes("not found")) {
    if (lowerMessage.includes("fund")) {
      return createError(PlatformErrorCode.FUND_NOT_FOUND, message);
    }
    if (lowerMessage.includes("investor")) {
      return createError(PlatformErrorCode.INVESTOR_NOT_FOUND, message);
    }
    if (lowerMessage.includes("transaction")) {
      return createError(PlatformErrorCode.TRANSACTION_NOT_FOUND, message);
    }
    if (lowerMessage.includes("position")) {
      return createError(PlatformErrorCode.INVESTOR_POSITION_NOT_FOUND, message);
    }
  }

  // Already voided
  if (lowerMessage.includes("already voided")) {
    return createError(PlatformErrorCode.TRANSACTION_ALREADY_VOIDED, message);
  }

  // Conservation violation
  if (
    lowerMessage.includes("conservation") ||
    (lowerMessage.includes("gross") && lowerMessage.includes("net"))
  ) {
    return createError(PlatformErrorCode.YIELD_CONSERVATION_VIOLATION, message);
  }

  // Permission errors
  if (lowerMessage.includes("unauthorized") || lowerMessage.includes("not authorized")) {
    return createError(PlatformErrorCode.UNAUTHORIZED, message);
  }

  if (lowerMessage.includes("admin") && lowerMessage.includes("required")) {
    return createError(PlatformErrorCode.ADMIN_REQUIRED, message);
  }

  // Default to system error
  return createSystemError(message);
}

/**
 * Create a typed error from code and message
 */
function createError(
  code: PlatformErrorCode,
  message: string,
  details?: Record<string, unknown>
): PlatformError {
  const metadata = ERROR_CODE_METADATA[code];
  return {
    code,
    category: metadata?.category || ErrorCategory.SYSTEM,
    message: metadata?.default_message || message,
    user_action_hint: metadata?.user_action_hint,
    ui_action: metadata?.ui_action,
    severity: metadata?.severity || "error",
    is_retryable: metadata?.is_retryable || false,
    details,
  };
}

/**
 * Create a system error
 */
function createSystemError(message: string): PlatformError {
  return {
    code: PlatformErrorCode.SYSTEM_ERROR,
    category: ErrorCategory.SYSTEM,
    message,
    severity: "error",
    is_retryable: true,
  };
}

// ============================================================================
// ERROR CODE METADATA (mirrors database table)
// ============================================================================

interface ErrorMetadata {
  category: ErrorCategory;
  default_message: string;
  user_action_hint?: string;
  ui_action?: ErrorUIAction;
  severity: ErrorSeverity;
  is_retryable: boolean;
}

/**
 * Client-side error metadata - mirrors error_code_metadata table
 * This allows error handling without network calls
 */
export const ERROR_CODE_METADATA: Record<PlatformErrorCode, ErrorMetadata> = {
  // AUM & Preflow Errors
  [PlatformErrorCode.PREFLOW_AUM_MISSING]: {
    category: ErrorCategory.STATE,
    default_message: "No preflow AUM record exists for this fund and date.",
    user_action_hint: "Create a preflow AUM record before proceeding.",
    ui_action: ErrorUIAction.OPEN_PREFLOW_AUM_MODAL,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.AUM_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    default_message: "AUM record not found.",
    user_action_hint: "Verify the fund and date are correct.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.AUM_ALREADY_EXISTS]: {
    category: ErrorCategory.CONFLICT,
    default_message: "An AUM record already exists for this fund, date, and purpose.",
    user_action_hint: "Use the existing AUM record or update it.",
    ui_action: ErrorUIAction.SHOW_EXISTING_AUM,
    severity: "warning",
    is_retryable: false,
  },
  [PlatformErrorCode.AUM_DUPLICATE_PREFLOW]: {
    category: ErrorCategory.CONFLICT,
    default_message: "Duplicate preflow AUM records detected.",
    user_action_hint: "Run cleanup to remove duplicates.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },

  // Period & Date Errors
  [PlatformErrorCode.PERIOD_LOCKED]: {
    category: ErrorCategory.STATE,
    default_message: "This accounting period is locked.",
    user_action_hint: "Request an unlock from the finance team before making changes.",
    ui_action: ErrorUIAction.SHOW_UNLOCK_REQUEST,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.PERIOD_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    default_message: "Accounting period not found.",
    user_action_hint: "Verify the date range is correct.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.ECONOMIC_DATE_REQUIRED]: {
    category: ErrorCategory.VALIDATION,
    default_message: "Transaction date is required.",
    user_action_hint: "Select a valid transaction date.",
    ui_action: ErrorUIAction.FOCUS_DATE_FIELD,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.FUTURE_DATE_NOT_ALLOWED]: {
    category: ErrorCategory.VALIDATION,
    default_message: "Future dates are not allowed in live mode.",
    user_action_hint: "Select today's date or an earlier date.",
    ui_action: ErrorUIAction.FOCUS_DATE_FIELD,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.BACKDATED_NOT_ALLOWED]: {
    category: ErrorCategory.STATE,
    default_message: "Backdating into a locked period is not allowed.",
    user_action_hint: "Select a date in an open period or request an unlock.",
    ui_action: ErrorUIAction.FOCUS_DATE_FIELD,
    severity: "error",
    is_retryable: false,
  },

  // Ledger & Transaction Errors
  [PlatformErrorCode.LEDGER_IMMUTABLE]: {
    category: ErrorCategory.BUSINESS_RULE,
    default_message: "Transactions cannot be edited after creation.",
    user_action_hint: "Use Void and Reissue to correct this transaction.",
    ui_action: ErrorUIAction.SHOW_VOID_REISSUE_OPTION,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.TRANSACTION_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    default_message: "Transaction not found.",
    user_action_hint: "Verify the transaction ID is correct.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.TRANSACTION_ALREADY_VOIDED]: {
    category: ErrorCategory.STATE,
    default_message: "This transaction has already been voided.",
    user_action_hint: "No further action is needed.",
    ui_action: ErrorUIAction.SHOW_VOIDED_STATUS,
    severity: "warning",
    is_retryable: false,
  },
  [PlatformErrorCode.INSUFFICIENT_BALANCE]: {
    category: ErrorCategory.BUSINESS_RULE,
    default_message: "Insufficient balance for this withdrawal.",
    user_action_hint: "Reduce the withdrawal amount or void related withdrawals first.",
    ui_action: ErrorUIAction.SHOW_BALANCE_INFO,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.INVALID_TRANSACTION_TYPE]: {
    category: ErrorCategory.VALIDATION,
    default_message: "Invalid transaction type.",
    user_action_hint: "Use a valid transaction type: DEPOSIT, WITHDRAWAL, YIELD, etc.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },

  // Asset & Currency Errors
  [PlatformErrorCode.ASSET_MISMATCH]: {
    category: ErrorCategory.VALIDATION,
    default_message: "Transaction asset does not match fund base asset.",
    user_action_hint: "Use the fund's native currency for all transactions.",
    ui_action: ErrorUIAction.LOCK_ASSET_FIELD,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.INVALID_ASSET]: {
    category: ErrorCategory.VALIDATION,
    default_message: "Invalid asset code.",
    user_action_hint: "Select a valid asset from the list.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },

  // Yield & Distribution Errors
  [PlatformErrorCode.YIELD_CONSERVATION_VIOLATION]: {
    category: ErrorCategory.SYSTEM,
    default_message: "Yield conservation violated: gross must equal net + fees.",
    user_action_hint: "Contact support. This is a system error.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "critical",
    is_retryable: false,
  },
  [PlatformErrorCode.DUST_TOLERANCE_EXCEEDED]: {
    category: ErrorCategory.BUSINESS_RULE,
    default_message: "Rounding difference exceeds dust tolerance.",
    user_action_hint: "Review the calculation for accuracy.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.NO_POSITIONS_FOR_YIELD]: {
    category: ErrorCategory.STATE,
    default_message: "No investor positions found for yield distribution.",
    user_action_hint: "Ensure investors have positions before distributing yield.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },

  // Fund Errors
  [PlatformErrorCode.FUND_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    default_message: "Fund not found.",
    user_action_hint: "Verify the fund ID is correct.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.FUND_INACTIVE]: {
    category: ErrorCategory.STATE,
    default_message: "This fund is not active.",
    user_action_hint: "Contact the administrator to activate the fund.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },

  // Investor Errors
  [PlatformErrorCode.INVESTOR_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    default_message: "Investor not found.",
    user_action_hint: "Verify the investor ID is correct.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.INVESTOR_POSITION_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    default_message: "Investor does not have a position in this fund.",
    user_action_hint: "Create a position for the investor first.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.INVESTOR_NOT_IN_FUND]: {
    category: ErrorCategory.VALIDATION,
    default_message: "Investor is not enrolled in this fund.",
    user_action_hint: "Enroll the investor in the fund first.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },

  // Approval & Permission Errors
  [PlatformErrorCode.APPROVAL_REQUIRED]: {
    category: ErrorCategory.PERMISSION,
    default_message: "This action requires approval from another administrator.",
    user_action_hint: "Submit for approval and wait for authorization.",
    ui_action: ErrorUIAction.SHOW_APPROVAL_REQUEST,
    severity: "warning",
    is_retryable: false,
  },
  [PlatformErrorCode.APPROVAL_PENDING]: {
    category: ErrorCategory.STATE,
    default_message: "An approval request is already pending.",
    user_action_hint: "Wait for the pending request to be processed.",
    ui_action: ErrorUIAction.SHOW_PENDING_STATUS,
    severity: "warning",
    is_retryable: false,
  },
  [PlatformErrorCode.SELF_APPROVAL_NOT_ALLOWED]: {
    category: ErrorCategory.PERMISSION,
    default_message: "You cannot approve your own request.",
    user_action_hint: "Another administrator must approve this action.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.UNAUTHORIZED]: {
    category: ErrorCategory.PERMISSION,
    default_message: "You are not authorized to perform this action.",
    user_action_hint: "Contact an administrator for access.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.ADMIN_REQUIRED]: {
    category: ErrorCategory.PERMISSION,
    default_message: "Administrator privileges are required.",
    user_action_hint: "Log in with an administrator account.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },

  // Validation Errors
  [PlatformErrorCode.VALIDATION_ERROR]: {
    category: ErrorCategory.VALIDATION,
    default_message: "Validation failed.",
    user_action_hint: "Check the form for errors and try again.",
    ui_action: ErrorUIAction.SHOW_FIELD_ERRORS,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.REQUIRED_FIELD_MISSING]: {
    category: ErrorCategory.VALIDATION,
    default_message: "A required field is missing.",
    user_action_hint: "Fill in all required fields.",
    ui_action: ErrorUIAction.FOCUS_FIRST_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.INVALID_AMOUNT]: {
    category: ErrorCategory.VALIDATION,
    default_message: "Invalid amount.",
    user_action_hint: "Enter a valid positive number.",
    ui_action: ErrorUIAction.FOCUS_AMOUNT_FIELD,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.INVALID_DATE]: {
    category: ErrorCategory.VALIDATION,
    default_message: "Invalid date.",
    user_action_hint: "Enter a valid date.",
    ui_action: ErrorUIAction.FOCUS_DATE_FIELD,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.INVALID_PURPOSE]: {
    category: ErrorCategory.VALIDATION,
    default_message: 'Invalid purpose. Must be "transaction" or "reporting".',
    user_action_hint: "Select a valid purpose.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },

  // System Errors
  [PlatformErrorCode.SYSTEM_ERROR]: {
    category: ErrorCategory.SYSTEM,
    default_message: "An unexpected system error occurred.",
    user_action_hint: "Please try again. If the problem persists, contact support.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: true,
  },
  [PlatformErrorCode.INVARIANT_VIOLATION]: {
    category: ErrorCategory.SYSTEM,
    default_message: "A system invariant was violated.",
    user_action_hint: "Contact support immediately. Do not retry.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "critical",
    is_retryable: false,
  },
  [PlatformErrorCode.CONCURRENCY_ERROR]: {
    category: ErrorCategory.CONFLICT,
    default_message: "The data was modified by another user.",
    user_action_hint: "Refresh and try again.",
    ui_action: ErrorUIAction.REFRESH_AND_RETRY,
    severity: "warning",
    is_retryable: true,
  },

  // Staging & Import Errors
  [PlatformErrorCode.STAGING_VALIDATION_FAILED]: {
    category: ErrorCategory.VALIDATION,
    default_message: "Staging batch validation failed.",
    user_action_hint: "Review and fix the errors in the staging data.",
    ui_action: ErrorUIAction.SHOW_STAGING_ERRORS,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.STAGING_BATCH_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    default_message: "Staging batch not found.",
    user_action_hint: "Verify the batch ID is correct.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "error",
    is_retryable: false,
  },
  [PlatformErrorCode.STAGING_ALREADY_PROMOTED]: {
    category: ErrorCategory.STATE,
    default_message: "This staging batch has already been promoted.",
    user_action_hint: "The data has already been imported.",
    ui_action: ErrorUIAction.SHOW_ERROR,
    severity: "warning",
    is_retryable: false,
  },
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if an error code is a known platform error code
 */
export function isPlatformErrorCode(code: string): code is PlatformErrorCode {
  return Object.values(PlatformErrorCode).includes(code as PlatformErrorCode);
}

/**
 * Check if response is a successful RPC response
 */
export function isSuccessResponse<T>(
  response: RpcResponse<T>
): response is RpcResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Check if response is an error RPC response
 */
export function isErrorResponse(
  response: RpcResponse
): response is RpcResponse & { success: false; error: PlatformError } {
  return response.success === false && response.error !== undefined;
}
