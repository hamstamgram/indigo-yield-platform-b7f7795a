/**
 * Admin Stats Service
 * Handles fetching dashboard statistics for admin users
 * Extracted from useAdminStats hook to follow service layer pattern
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { logError } from "@/lib/logger";

export interface AdminStats {
  totalFunds: number;
  totalPositions: number;
  activePositions: number;
  totalProfiles: number;
  activeProfiles: number;
  uniqueInvestorsWithPositions: number;
  pendingWithdrawals: number;
  recentActivity: number;
}

/**
 * Fetch all admin dashboard statistics from authoritative server-side RPC
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const { data, error } = await rpc.callNoArgs("get_admin_stats");

  if (error) {
    logError("fetchAdminStats", error);
    throw new Error(`Failed to fetch admin stats: ${error.message}`);
  }

  // Cast the untyped jsonb result to AdminStats
  return data as unknown as AdminStats;
}

type FundStatus = "active" | "deprecated" | "inactive" | "pending" | "suspended";

/**
 * Get fund count by status
 */
export async function getFundCountByStatus(status: FundStatus): Promise<number> {
  const { count, error } = await supabase
    .from("funds")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) {
    logError("getFundCountByStatus", error, { status });
    return 0;
  }

  return count || 0;
}

/**
 * Get pending withdrawal count
 */
export async function getPendingWithdrawalCount(): Promise<number> {
  const { count, error } = await supabase
    .from("withdrawal_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    logError("getPendingWithdrawalCount", error);
    return 0;
  }

  return count || 0;
}

/**
 * Get recent activity count (last 24 hours)
 */
export async function getRecentActivityCount(hoursAgo: number = 24): Promise<number> {
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("transactions_v2")
    .select("id", { count: "exact", head: true })
    .eq("is_voided", false)
    .gte("created_at", cutoffTime);

  if (error) {
    logError("getRecentActivityCount", error, { hoursAgo });
    return 0;
  }

  return count || 0;
}
