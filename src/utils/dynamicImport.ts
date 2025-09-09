/**
 * Dynamic import helper with retry logic and error handling
 * Improves code splitting and handles network failures gracefully
 */

interface ImportOptions {
  retries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}

const DEFAULT_OPTIONS: ImportOptions = {
  retries: 3,
  retryDelay: 1000,
};

/**
 * Dynamically imports a module with retry logic
 * @param importFn - Function that returns the dynamic import promise
 * @param options - Import options for retry and error handling
 */
export async function dynamicImport<T>(
  importFn: () => Promise<T>,
  options: ImportOptions = {}
): Promise<T> {
  const { retries, retryDelay, onError } = { ...DEFAULT_OPTIONS, ...options };
  
  let lastError: Error | null = null;
  
  for (let i = 0; i <= (retries || 0); i++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < (retries || 0)) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // All retries failed
  if (onError && lastError) {
    onError(lastError);
  }
  
  throw lastError;
}

/**
 * Preloads a component for faster subsequent loading
 * Useful for components that will likely be needed soon
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  // Start the import but don't wait for it
  importFn().catch(() => {
    // Silently ignore preload errors
  });
}

/**
 * Creates a lazy component with retry logic
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(() => dynamicImport(importFn));
}

// Export React for convenience
import React from 'react';
