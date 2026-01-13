/**
 * Prefetch on Hover Hook
 * Triggers data prefetching when users hover over navigation items
 */

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPrefetchFn } from "@/utils/prefetch/adminPrefetch";

const HOVER_DELAY_MS = 100;

/**
 * Hook that provides a function to prefetch route data on hover
 * Includes debouncing to avoid excessive prefetches during quick mouse movements
 */
export function usePrefetchOnHover() {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetchRoute = useCallback((href: string) => {
    // Don't prefetch if already prefetched in this session
    if (prefetchedRef.current.has(href)) {
      return;
    }

    const prefetchFn = getPrefetchFn(href);
    if (!prefetchFn) {
      return;
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the prefetch to avoid quick mouse movements
    timeoutRef.current = setTimeout(() => {
      prefetchFn(queryClient)
        .then(() => {
          prefetchedRef.current.add(href);
        })
        .catch(() => {
          // Silently ignore prefetch errors
        });
    }, HOVER_DELAY_MS);
  }, [queryClient]);

  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { prefetchRoute, cancelPrefetch };
}
