/**
 * Error Types Index
 *
 * Re-exports all error-related types and utilities
 */

export {
  // Enums
  PlatformErrorCode,
  ErrorCategory,
  ErrorUIAction,
  // Types
  type ErrorSeverity,
  type PlatformError,
  type RpcResponse,
  // Functions
  parsePlatformError,
  isPlatformErrorCode,
  isSuccessResponse,
  isErrorResponse,
  // Constants
  ERROR_CODE_METADATA,
} from "./platformErrors";
