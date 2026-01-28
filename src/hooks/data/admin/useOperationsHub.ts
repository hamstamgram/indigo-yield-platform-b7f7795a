/**
 * Operations Hub Hooks
 * React Query hooks and realtime utilities for operations hub
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import {
  getRecentAuditLogs,
  setupOperationsRealtimeChannel,
  removeOperationsChannel,
  type OperationsAuditLogEntry as AuditLogEntry,
} from "@/services/admin";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to fetch recent audit logs
 */
export function useRecentAuditLogs(limit: number = 10) {
  return useQuery<AuditLogEntry[]>({
    queryKey: QUERY_KEYS.recentAuditLogs(limit),
    queryFn: () => getRecentAuditLogs(limit),
  });
}

/**
 * Hook to setup operations realtime subscriptions with debounce
 * @param onUpdate - Callback to invoke when updates occur (debounced)
 * @param debounceMs - Debounce delay in milliseconds (default: 1000ms)
 */
export function useOperationsRealtime(onUpdate: () => void, debounceMs: number = 1000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedUpdate = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onUpdate();
    }, debounceMs);
  }, [onUpdate, debounceMs]);

  useEffect(() => {
    const channel = setupOperationsRealtimeChannel(debouncedUpdate);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      removeOperationsChannel(channel);
    };
  }, [debouncedUpdate]);
}

// Re-export types
export type { AuditLogEntry };
