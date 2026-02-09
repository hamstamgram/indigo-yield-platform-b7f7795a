/**
 * Platform Error Handling Hook
 *
 * Provides typed error handling for Supabase RPC calls with
 * automatic UI action suggestions and toast notifications.
 */

import { useCallback, useState } from "react";
import { logError } from "@/lib/logger";
import { toast } from "sonner";
import {
  PlatformError,
  PlatformErrorCode,
  ErrorCategory,
  ErrorUIAction,
  RpcResponse,
  parsePlatformError,
  isSuccessResponse,
  isErrorResponse,
  ERROR_CODE_METADATA,
} from "@/types/errors/platformErrors";

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorHandlerOptions {
  /** Custom toast options */
  toastOptions?: {
    duration?: number;
    dismissible?: boolean;
  };
  /** Callback when UI action is suggested */
  onUIAction?: (action: ErrorUIAction | string, error: PlatformError) => void;
  /** Override default error message */
  customMessage?: string;
  /** Show toast notification (default: true) */
  showToast?: boolean;
  /** Log error to console (default: true in dev) */
  logError?: boolean;
}

export interface UseErrorHandlerResult {
  /** The last error that occurred */
  error: PlatformError | null;
  /** Clear the current error */
  clearError: () => void;
  /** Handle an error with toast and UI action */
  handleError: (error: unknown, options?: ErrorHandlerOptions) => PlatformError;
  /** Handle an RPC response, extracting success data or error */
  handleRpcResponse: <T>(response: RpcResponse<T>, options?: ErrorHandlerOptions) => T | null;
  /** Check if a specific error code is active */
  hasErrorCode: (code: PlatformErrorCode) => boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for handling platform errors with typed error codes and UI actions
 *
 * @example
 * ```tsx
 * const { handleError, handleRpcResponse, error } = usePlatformError();
 *
 * const submitDeposit = async () => {
 *   const response = await supabase.rpc('apply_transaction_with_crystallization', {...});
 *   const result = handleRpcResponse(response.data, {
 *     onUIAction: (action, error) => {
 *       if (action === 'OPEN_PREFLOW_AUM_MODAL') {
 *         setShowPreflowModal(true);
 *       }
 *     }
 *   });
 *   if (result) {
 *     // Success! result contains the data
 *   }
 * };
 * ```
 */
export function usePlatformError(): UseErrorHandlerResult {
  const [error, setError] = useState<PlatformError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback(
    (rawError: unknown, options: ErrorHandlerOptions = {}): PlatformError => {
      const {
        toastOptions = {},
        onUIAction,
        customMessage,
        showToast = true,
        logError: shouldLogError = process.env.NODE_ENV === "development",
      } = options;

      // Parse the error into a typed PlatformError
      const platformError = parsePlatformError(rawError);

      // Store the error
      setError(platformError);

      // Log if enabled
      if (shouldLogError) {
        logError("usePlatformError.handleError", platformError, {
          code: platformError.code,
          category: platformError.category,
          message: platformError.message,
        });
      }

      // Show toast notification
      if (showToast) {
        const message = customMessage || platformError.message;
        const description = platformError.user_action_hint;

        switch (platformError.severity) {
          case "critical":
            toast.error(message, {
              description,
              duration: 10000,
              ...toastOptions,
            });
            break;
          case "warning":
            toast.warning(message, {
              description,
              duration: 5000,
              ...toastOptions,
            });
            break;
          default:
            toast.error(message, {
              description,
              duration: 5000,
              ...toastOptions,
            });
        }
      }

      // Trigger UI action callback
      if (onUIAction && platformError.ui_action) {
        onUIAction(platformError.ui_action, platformError);
      }

      return platformError;
    },
    []
  );

  const handleRpcResponse = useCallback(
    <T>(response: RpcResponse<T>, options: ErrorHandlerOptions = {}): T | null => {
      // Check for error response
      if (isErrorResponse(response)) {
        handleError(response, options);
        return null;
      }

      // Check for success response
      if (isSuccessResponse(response)) {
        clearError();
        return response.data;
      }

      // Unknown response format - treat as success if data exists
      if (response.data !== undefined) {
        clearError();
        return response.data as T;
      }

      // No data and no explicit error - unknown format
      handleError(
        { message: "Unexpected response format" },
        { ...options, customMessage: "An unexpected error occurred" }
      );
      return null;
    },
    [handleError, clearError]
  );

  const hasErrorCode = useCallback(
    (code: PlatformErrorCode): boolean => {
      return error?.code === code;
    },
    [error]
  );

  return {
    error,
    clearError,
    handleError,
    handleRpcResponse,
    hasErrorCode,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get user-friendly message for an error code
 */
export function getErrorMessage(code: PlatformErrorCode): string {
  return ERROR_CODE_METADATA[code]?.default_message || "An error occurred";
}

/**
 * Get action hint for an error code
 */
export function getErrorActionHint(code: PlatformErrorCode): string | undefined {
  return ERROR_CODE_METADATA[code]?.user_action_hint;
}

/**
 * Get suggested UI action for an error code
 */
export function getErrorUIAction(code: PlatformErrorCode): ErrorUIAction | undefined {
  return ERROR_CODE_METADATA[code]?.ui_action;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: PlatformError): boolean {
  return error.is_retryable;
}

/**
 * Check if an error requires admin intervention
 */
export function requiresAdminIntervention(error: PlatformError): boolean {
  return (
    error.severity === "critical" ||
    error.code === PlatformErrorCode.INVARIANT_VIOLATION ||
    error.code === PlatformErrorCode.YIELD_CONSERVATION_VIOLATION
  );
}

/**
 * Check if an error is related to permissions
 */
export function isPermissionError(error: PlatformError): boolean {
  return error.category === ErrorCategory.PERMISSION;
}

/**
 * Check if an error is a validation error (user can fix)
 */
export function isValidationError(error: PlatformError): boolean {
  return error.category === ErrorCategory.VALIDATION;
}

/**
 * Check if an error is a state error (wrong state for operation)
 */
export function isStateError(error: PlatformError): boolean {
  return error.category === ErrorCategory.STATE;
}

// ============================================================================
// ERROR-SPECIFIC HANDLERS
// ============================================================================

/**
 * Handle preflow AUM missing error with specific UI guidance
 */
export function handlePreflowAumMissing(
  error: PlatformError,
  callbacks: {
    onOpenPreflowModal?: (fundId: string, date: string) => void;
  }
): void {
  if (error.code !== PlatformErrorCode.PREFLOW_AUM_MISSING) return;

  const details = error.details as { fund_id?: string; tx_date?: string } | undefined;
  if (callbacks.onOpenPreflowModal && details?.fund_id && details?.tx_date) {
    callbacks.onOpenPreflowModal(details.fund_id, details.tx_date);
  }
}

/**
 * Handle period locked error with unlock request option
 */
export function handlePeriodLocked(
  error: PlatformError,
  callbacks: {
    onRequestUnlock?: (fundId: string, date: string) => void;
  }
): void {
  if (error.code !== PlatformErrorCode.PERIOD_LOCKED) return;

  const details = error.details as { fund_id?: string; tx_date?: string } | undefined;
  if (callbacks.onRequestUnlock && details?.fund_id && details?.tx_date) {
    callbacks.onRequestUnlock(details.fund_id, details.tx_date);
  }
}

/**
 * Handle ledger immutable error with void/reissue option
 */
export function handleLedgerImmutable(
  error: PlatformError,
  callbacks: {
    onShowVoidReissue?: (transactionId: string) => void;
  }
): void {
  if (error.code !== PlatformErrorCode.LEDGER_IMMUTABLE) return;

  const details = error.details as { transaction_id?: string } | undefined;
  if (callbacks.onShowVoidReissue && details?.transaction_id) {
    callbacks.onShowVoidReissue(details.transaction_id);
  }
}

/**
 * Handle insufficient balance error with balance info
 */
export function handleInsufficientBalance(
  error: PlatformError,
  callbacks: {
    onShowBalanceInfo?: (currentValue: number, requestedAmount: number) => void;
  }
): void {
  if (error.code !== PlatformErrorCode.INSUFFICIENT_BALANCE) return;

  const details = error.details as
    | {
        current_value?: number;
        requested_amount?: number;
      }
    | undefined;
  if (
    callbacks.onShowBalanceInfo &&
    details?.current_value !== undefined &&
    details?.requested_amount !== undefined
  ) {
    callbacks.onShowBalanceInfo(details.current_value, details.requested_amount);
  }
}

// ============================================================================
// COMPOSITE ERROR HANDLER
// ============================================================================

export interface ErrorActionCallbacks {
  onOpenPreflowModal?: (fundId: string, date: string) => void;
  onRequestUnlock?: (fundId: string, date: string) => void;
  onShowVoidReissue?: (transactionId: string) => void;
  onShowBalanceInfo?: (currentValue: number, requestedAmount: number) => void;
  onFocusDateField?: () => void;
  onFocusAmountField?: () => void;
  onRefreshAndRetry?: () => void;
  onShowApprovalRequest?: () => void;
}

/**
 * Route error to appropriate handler based on UI action
 */
export function routeErrorAction(error: PlatformError, callbacks: ErrorActionCallbacks): void {
  switch (error.ui_action) {
    case ErrorUIAction.OPEN_PREFLOW_AUM_MODAL:
      handlePreflowAumMissing(error, callbacks);
      break;
    case ErrorUIAction.SHOW_UNLOCK_REQUEST:
      handlePeriodLocked(error, callbacks);
      break;
    case ErrorUIAction.SHOW_VOID_REISSUE_OPTION:
      handleLedgerImmutable(error, callbacks);
      break;
    case ErrorUIAction.SHOW_BALANCE_INFO:
      handleInsufficientBalance(error, callbacks);
      break;
    case ErrorUIAction.FOCUS_DATE_FIELD:
      callbacks.onFocusDateField?.();
      break;
    case ErrorUIAction.FOCUS_AMOUNT_FIELD:
      callbacks.onFocusAmountField?.();
      break;
    case ErrorUIAction.REFRESH_AND_RETRY:
      callbacks.onRefreshAndRetry?.();
      break;
    case ErrorUIAction.SHOW_APPROVAL_REQUEST:
      callbacks.onShowApprovalRequest?.();
      break;
  }
}

export default usePlatformError;
