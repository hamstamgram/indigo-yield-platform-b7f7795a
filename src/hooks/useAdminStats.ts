/**
 * Centralized Admin Statistics Hook
 * Single source of truth for all admin dashboard metrics
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminStats {
  // Fund metrics
  totalFunds: number;
  
  // Position metrics
  totalPositions: number;        // Total rows in investor_positions
  activePositions: number;       // Positions with current_value > 0
  
  // Investor metrics
  totalProfiles: number;         // All non-admin profiles
  activeProfiles: number;        // Profiles with status='active'
  uniqueInvestorsWithPositions: number; // Unique investors that have at least one position
  
  // Operational metrics
  pendingWithdrawals: number;
  recentActivity: number;        // 24h transaction count
}

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
      
      // Parallel fetch all stats
      const [
        fundsResult,
        profilesResult,
        positionsResult,
        withdrawalsResult,
        activityResult,
      ] = await Promise.all([
        // Active funds count
        supabase
          .from("funds")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        
        // All non-admin profiles
        supabase
          .from("profiles")
          .select("id, status")
          .eq("is_admin", false),
        
        // All investor positions
        supabase
          .from("investor_positions")
          .select("investor_id, current_value"),
        
        // Pending withdrawals
        supabase
          .from("withdrawal_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        
        // 24h activity
        supabase
          .from("transactions_v2")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      // Calculate profile stats
      const profiles = profilesResult.data || [];
      const totalProfiles = profiles.length;
      const activeProfiles = profiles.filter((p) => p.status === "active").length;

      // Calculate position stats
      const positions = positionsResult.data || [];
      const totalPositions = positions.length;
      const activePositions = positions.filter((p) => (p.current_value || 0) > 0).length;
      const uniqueInvestorIds = new Set(positions.map((p) => p.investor_id));
      const uniqueInvestorsWithPositions = uniqueInvestorIds.size;

      setStats({
        totalFunds: fundsResult.count || 0,
        totalPositions,
        activePositions,
        totalProfiles,
        activeProfiles,
        uniqueInvestorsWithPositions,
        pendingWithdrawals: withdrawalsResult.count || 0,
        recentActivity: activityResult.count || 0,
      });
    } catch (err) {
      console.error("Failed to load admin stats:", err);
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
