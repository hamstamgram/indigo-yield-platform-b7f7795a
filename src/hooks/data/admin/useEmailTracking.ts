/**
 * Email Tracking Hooks
 * React Query hooks for email tracking data
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  getEmailStats,
  getEmailDeliveries,
  type EmailStats,
  type EmailDelivery,
  type EmailFilters,
} from "@/services/admin/emailTrackingService";

/**
 * Hook to fetch email statistics
 */
export function useEmailStats() {
  return useQuery<EmailStats>({
    queryKey: QUERY_KEYS.emailStats,
    queryFn: getEmailStats,
    refetchInterval: 30000,
  });
}

/**
 * Hook to fetch email deliveries with filters
 */
export function useEmailDeliveries(filters: EmailFilters) {
  return useQuery<EmailDelivery[]>({
    queryKey: QUERY_KEYS.emailDeliveries(filters as unknown as Record<string, unknown>),
    queryFn: () => getEmailDeliveries(filters),
  });
}

// Re-export types for convenience
export type { EmailStats, EmailDelivery, EmailFilters };
