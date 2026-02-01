/**
 * Correlation ID Utility for Operation Tracing
 *
 * Provides a way to trace operations across service calls for debugging and audit purposes.
 * Each operation can have a unique correlation ID that is passed through all related calls.
 */

import { logError, logWarn, logInfo, logDebug } from "@/lib/logger";

type CorrelationContext = {
  correlationId: string;
  operationType: string;
  startedAt: Date;
  metadata: Record<string, unknown>;
};

// In-memory store for active correlations (per request lifecycle)
const activeCorrelations = new Map<string, CorrelationContext>();

/**
 * Generate a new correlation ID
 * Format: {prefix}_{timestamp}_{random}
 */
export function generateCorrelationId(prefix: string = "op"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Start a new correlated operation
 * Returns a correlation ID that should be passed to all related calls
 */
export function startOperation(
  operationType: string,
  metadata: Record<string, unknown> = {}
): string {
  const correlationId = generateCorrelationId(operationType.substring(0, 3).toLowerCase());

  activeCorrelations.set(correlationId, {
    correlationId,
    operationType,
    startedAt: new Date(),
    metadata,
  });

  return correlationId;
}

/**
 * Get the context for an active correlation
 */
export function getCorrelationContext(correlationId: string): CorrelationContext | undefined {
  return activeCorrelations.get(correlationId);
}

/**
 * End a correlated operation and clean up
 */
export function endOperation(correlationId: string): void {
  activeCorrelations.delete(correlationId);
}

/**
 * Add metadata to an existing correlation
 */
export function addCorrelationMetadata(
  correlationId: string,
  metadata: Record<string, unknown>
): void {
  const context = activeCorrelations.get(correlationId);
  if (context) {
    context.metadata = { ...context.metadata, ...metadata };
  }
}

/**
 * Create a logger with correlation context
 */
export function createCorrelatedLogger(correlationId: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => {
      logInfo(`correlated.${correlationId}`, { message, ...data });
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      logWarn(`correlated.${correlationId}`, { message, ...data });
    },
    error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) => {
      logError(`correlated.${correlationId}`, error, { message, ...data });
    },
    debug: (message: string, data?: Record<string, unknown>) => {
      logDebug(`correlated.${correlationId}`, { message, ...data });
    },
  };
}

/**
 * Wrapper for async operations with automatic correlation tracking
 */
export async function withCorrelation<T>(
  operationType: string,
  metadata: Record<string, unknown>,
  operation: (correlationId: string, log: ReturnType<typeof createCorrelatedLogger>) => Promise<T>
): Promise<{ result: T; correlationId: string }> {
  const correlationId = startOperation(operationType, metadata);
  const log = createCorrelatedLogger(correlationId);

  try {
    log.info(`Starting ${operationType}`, metadata);
    const result = await operation(correlationId, log);
    log.info(`Completed ${operationType}`);
    return { result, correlationId };
  } catch (error) {
    log.error(`Failed ${operationType}`, error, metadata);
    throw error;
  } finally {
    endOperation(correlationId);
  }
}

/**
 * Hook-friendly wrapper that returns correlation utilities
 */
export function useCorrelation(operationType: string) {
  let correlationId: string | null = null;
  let log: ReturnType<typeof createCorrelatedLogger> | null = null;

  return {
    start: (metadata: Record<string, unknown> = {}) => {
      correlationId = startOperation(operationType, metadata);
      log = createCorrelatedLogger(correlationId);
      log.info(`Starting ${operationType}`, metadata);
      return correlationId;
    },

    end: () => {
      if (correlationId) {
        log?.info(`Completed ${operationType}`);
        endOperation(correlationId);
        correlationId = null;
        log = null;
      }
    },

    fail: (error: Error | unknown) => {
      if (correlationId && log) {
        log.error(`Failed ${operationType}`, error);
        endOperation(correlationId);
        correlationId = null;
        log = null;
      }
    },

    log: () => log,

    getId: () => correlationId,

    addMetadata: (metadata: Record<string, unknown>) => {
      if (correlationId) {
        addCorrelationMetadata(correlationId, metadata);
      }
    },
  };
}
