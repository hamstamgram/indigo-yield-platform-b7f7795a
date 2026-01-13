/**
 * Structured Logger
 * 
 * Provides consistent logging across the application with:
 * - Structured log format with context
 * - Log levels (debug, info, warn, error)
 * - Environment-aware behavior (production suppresses debug)
 * - Integration with error handler
 * 
 * Usage:
 * ```typescript
 * import { logger, logError, logInfo, logWarn, logDebug } from "@/lib/logger";
 * 
 * // Simple usage
 * logError("withdrawal.approve", error, { withdrawalId });
 * logInfo("yield.applied", { fundId, amount });
 * 
 * // With logger instance
 * const log = logger.child("YieldService");
 * log.info("Processing yield", { fundId });
 * log.error("Failed", error);
 * ```
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

export interface LoggerOptions {
  /** Prefix for all log messages */
  prefix?: string;
  /** Minimum log level to output */
  minLevel?: LogLevel;
  /** Additional context added to all logs */
  defaultContext?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = import.meta.env.DEV;

/**
 * Structured logger class
 */
class Logger {
  private prefix: string;
  private minLevel: LogLevel;
  private defaultContext: Record<string, unknown>;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || "";
    this.minLevel = options.minLevel || (isDev ? "debug" : "info");
    this.defaultContext = options.defaultContext || {};
  }

  /**
   * Create a child logger with additional prefix/context
   */
  child(prefix: string, context?: Record<string, unknown>): Logger {
    const newPrefix = this.prefix ? `${this.prefix}.${prefix}` : prefix;
    return new Logger({
      prefix: newPrefix,
      minLevel: this.minLevel,
      defaultContext: { ...this.defaultContext, ...context },
    });
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  /**
   * Format and output log
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message: this.prefix ? `[${this.prefix}] ${message}` : message,
      timestamp: new Date().toISOString(),
      context: { ...this.defaultContext, ...context },
      error,
    };

    // Format output based on level
    const formattedMessage = `${entry.message}`;
    const hasContext = Object.keys(entry.context || {}).length > 0;

    switch (level) {
      case "debug":
        if (hasContext) {
          console.debug(formattedMessage, entry.context);
        } else {
          console.debug(formattedMessage);
        }
        break;
      case "info":
        if (hasContext) {
          console.info(formattedMessage, entry.context);
        } else {
          console.info(formattedMessage);
        }
        break;
      case "warn":
        if (hasContext) {
          console.warn(formattedMessage, entry.context);
        } else {
          console.warn(formattedMessage);
        }
        break;
      case "error":
        if (error) {
          console.error(formattedMessage, { ...entry.context, error });
        } else if (hasContext) {
          console.error(formattedMessage, entry.context);
        } else {
          console.error(formattedMessage);
        }
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    this.log("error", message, context, error);
  }
}

// ============================================================================
// Default Logger Instance
// ============================================================================

export const logger = new Logger();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Log an error with operation context
 * @example logError("withdrawal.approve", error, { withdrawalId });
 */
export function logError(operation: string, error: unknown, context?: Record<string, unknown>): void {
  logger.child(operation).error("Operation failed", error, context);
}

/**
 * Log info message with context
 * @example logInfo("yield.applied", { fundId, amount });
 */
export function logInfo(operation: string, context?: Record<string, unknown>): void {
  logger.child(operation).info("", context);
}

/**
 * Log warning message with context
 * @example logWarn("validation.skipped", { reason: "no positions" });
 */
export function logWarn(operation: string, context?: Record<string, unknown>): void {
  logger.child(operation).warn("", context);
}

/**
 * Log debug message with context
 * @example logDebug("rpc.call", { functionName, args });
 */
export function logDebug(operation: string, context?: Record<string, unknown>): void {
  logger.child(operation).debug("", context);
}

// ============================================================================
// Service Logger Factory
// ============================================================================

/**
 * Create a logger for a service
 * @example const log = createServiceLogger("YieldService");
 */
export function createServiceLogger(serviceName: string, context?: Record<string, unknown>): Logger {
  return logger.child(serviceName, context);
}

export default logger;
