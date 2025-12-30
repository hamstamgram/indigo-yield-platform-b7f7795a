/**
 * Action Bar Hooks
 * React Query hooks for action bar pending counts
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { actionBarService, type PendingCounts } from "@/services";

/**
 * Hook to fetch pending counts for the action bar
 */
export function usePendingCounts(isAdmin: boolean) {
  const query = useQuery<PendingCounts>({
    queryKey: ["admin", "pendingCounts"],
    queryFn: actionBarService.fetchPendingCounts,
    enabled: isAdmin,
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = actionBarService.subscribeToWithdrawalChanges(() => {
      query.refetch();
    });

    return unsubscribe;
  }, [isAdmin, query.refetch]);

  return query;
}

// Re-export types
export type { PendingCounts };
