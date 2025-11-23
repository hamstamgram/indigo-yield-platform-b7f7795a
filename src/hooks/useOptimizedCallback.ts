import { useCallback, useRef, useEffect } from "react";

/**
 * Optimized useCallback that prevents stale closures
 * Always uses the latest callback without recreating the function reference
 *
 * @param callback - The callback function to optimize
 * @returns Memoized callback that always uses latest version
 *
 * @example
 * const handleClick = useOptimizedCallback((id: string) => {
 *   console.log(latestState, id);
 * });
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}
