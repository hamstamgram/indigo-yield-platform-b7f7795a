import { lazy, ComponentType, LazyExoticComponent } from "react";
import { logError, logWarn } from "@/lib/logger";

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Enhanced lazy loading with retry logic for failed module imports
 * This helps handle network issues and temporary loading failures
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: RetryOptions = {}
): LazyExoticComponent<T> {
  const { maxRetries = 3, retryDelay = 1000 } = options;

  return lazy(async () => {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        return await importFn();
      } catch (error) {
        retries++;

        if (retries === maxRetries) {
          // On final retry failure, try to recover by reloading
          logError("lazyWithRetry", error, { maxRetries });

          // Check if it's a chunk loading error
          if (error instanceof Error && error.message.includes("Loading chunk")) {
            // Prompt user to reload
            if (
              window.confirm(
                "Failed to load application resources. Would you like to reload the page?"
              )
            ) {
              window.location.reload();
            }
          }

          throw error;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay * retries));
      }
    }

    throw new Error("Failed to load module");
  });
}

/**
 * Preload a lazy component to improve perceived performance
 */
export function preloadComponent(lazyComponent: LazyExoticComponent<any>): void {
  // Trigger the lazy loading without rendering
  // @ts-expect-error React.lazy internal _payload structure is not exposed in public types
  const componentPromise = lazyComponent._payload?._result;
  if (componentPromise && typeof componentPromise.then === "function") {
    componentPromise.catch(() => {
      logWarn("preloadComponent", { reason: "Failed to preload component" });
    });
  }
}

/**
 * Create a lazy component with automatic preloading on hover/focus
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: RetryOptions = {}
): LazyExoticComponent<T> & { preload: () => void } {
  const LazyComponent = lazyWithRetry(importFn, options) as LazyExoticComponent<T> & {
    preload: () => void;
  };

  LazyComponent.preload = () => {
    importFn().catch((error) => {
      logWarn("lazyWithPreload.preload", { reason: "Failed to preload component" });
    });
  };

  return LazyComponent;
}

/**
 * Priority-based lazy loading for critical routes
 */
export enum LoadPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

interface PriorityLoadOptions extends RetryOptions {
  priority?: LoadPriority;
}

export function lazyWithPriority<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: PriorityLoadOptions = {}
): LazyExoticComponent<T> {
  const { priority = LoadPriority.MEDIUM, ...retryOptions } = options;

  // High priority components get more retries and shorter delays
  if (priority === LoadPriority.HIGH) {
    retryOptions.maxRetries = retryOptions.maxRetries ?? 5;
    retryOptions.retryDelay = retryOptions.retryDelay ?? 500;
  } else if (priority === LoadPriority.LOW) {
    retryOptions.maxRetries = retryOptions.maxRetries ?? 2;
    retryOptions.retryDelay = retryOptions.retryDelay ?? 2000;
  }

  return lazyWithRetry(importFn, retryOptions);
}
