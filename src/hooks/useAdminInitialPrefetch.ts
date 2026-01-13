/**
 * Admin Initial Prefetch Hook
 * Prefetches high-priority admin data after page load
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HIGH_PRIORITY_ADMIN_ROUTES, getPrefetchFn } from "@/utils/prefetch/adminPrefetch";

const INITIAL_PREFETCH_DELAY_MS = 1000;

/**
 * Hook to prefetch high-priority admin routes after initial page load
 * Should be used in AdminLayout or a high-level admin component
 */
export function useAdminInitialPrefetch() {
  const queryClient = useQueryClient();
  const hasPrefetchedRef = useRef(false);

  useEffect(() => {
    // Only prefetch once per mount
    if (hasPrefetchedRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      hasPrefetchedRef.current = true;
      
      HIGH_PRIORITY_ADMIN_ROUTES.forEach((route) => {
        const prefetchFn = getPrefetchFn(route);
        if (prefetchFn) {
          prefetchFn(queryClient).catch(() => {
            // Silently ignore prefetch errors
          });
        }
      });
    }, INITIAL_PREFETCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [queryClient]);
}
