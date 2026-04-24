/**
 * Centralized Admin Statistics Hook
 * Single source of truth for all admin dashboard metrics
 *
 * REFACTORED: Uses React Query for caching + realtime invalidation
 */

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAdminStats, AdminStats } from "@/features/admin/dashboard/services/adminStatsService";
import { QUERY_KEYS } from "@/constants/queryKeys";

let adminStatsChannelCounter = 0;

// Re-export the type for consumers
export type { AdminStats };

const ADMIN_STATS_KEY = QUERY_KEYS.adminDashboard;

export function useAdminStats() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loading, error, refetch } = useQuery<AdminStats>({
    queryKey: ADMIN_STATS_KEY,
    queryFn: fetchAdminStats,
    staleTime: 30_000, // 30s
    initialData: {
      totalFunds: 0,
      totalPositions: 0,
      activePositions: 0,
      totalProfiles: 0,
      activeProfiles: 0,
      uniqueInvestorsWithPositions: 0,
      pendingWithdrawals: 0,
      recentActivity: 0,
    },
  });

  const channelIdRef = useRef(++adminStatsChannelCounter);

  // Realtime subscription invalidates the cache instead of fetching directly
  useEffect(() => {
    const channelName = `admin-stats-withdrawals-${channelIdRef.current}`;
    const withdrawalChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawal_requests",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
        }
      )
      .subscribe();

    return () => {
      withdrawalChannel.unsubscribe();
      supabase.removeChannel(withdrawalChannel);
    };
  }, [queryClient]);

  return {
    stats: stats!,
    loading,
    error: error ?? null,
    refetch,
  };
}
