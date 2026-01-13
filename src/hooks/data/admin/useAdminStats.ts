/**
 * Centralized Admin Statistics Hook
 * Single source of truth for all admin dashboard metrics
 * 
 * REFACTORED: Now delegates to adminStatsService following service layer pattern
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAdminStats, AdminStats } from "@/services/admin/adminStatsService";
import { logError } from "@/lib/logger";

// Re-export the type for consumers
export type { AdminStats };

const initialStats: AdminStats = {
  totalFunds: 0,
  totalPositions: 0,
  activePositions: 0,
  totalProfiles: 0,
  activeProfiles: 0,
  uniqueInvestorsWithPositions: 0,
  pendingWithdrawals: 0,
  recentActivity: 0,
};

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      logError("useAdminStats.loadStats", err);
      setError(err instanceof Error ? err : new Error("Failed to load stats"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();

    // Set up realtime subscription for withdrawals
    const withdrawalChannel = supabase
      .channel("admin-stats-withdrawals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawal_requests",
        },
        () => loadStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(withdrawalChannel);
    };
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refetch: loadStats,
  };
}
