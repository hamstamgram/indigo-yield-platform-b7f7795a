/**
 * Admin Stats Service
 * Handles fetching dashboard statistics for admin users
 * Extracted from useAdminStats hook to follow service layer pattern
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

export interface AdminStats {
  // Fund metrics
  totalFunds: number;

  // Position metrics
  totalPositions: number; // Total rows in investor_positions
  activePositions: number; // Positions with current_value > 0

  // Investor metrics
  totalProfiles: number; // All non-admin profiles
  activeProfiles: number; // Profiles with status='active'
  uniqueInvestorsWithPositions: number; // Unique investors that have at least one position

  // Operational metrics
  pendingWithdrawals: number;
  recentActivity: number; // 24h transaction count
}

interface ProfileData {
  id: string;
  status: string | null;
  account_type: string | null;
  is_admin: boolean | null;
}

interface PositionData {
  investor_id: string;
  current_value: number | null;
}

/**
 * Fetch all admin dashboard statistics in parallel
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const [fundsResult, profilesResult, positionsResult, withdrawalsResult, activityResult] =
    await Promise.all([
      // Active funds count
      supabase.from("funds").select("id", { count: "exact", head: true }).eq("status", "active"),

      // All profiles (investor + IB + fees_account + admin)
      supabase.from("profiles").select("id, status, account_type, is_admin").limit(500),

      // All investor positions
      supabase.from("investor_positions").select("investor_id, current_value").limit(500),

      // Pending withdrawals
      supabase
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),

      // 24h activity (exclude voided)
      supabase
        .from("transactions_v2")
        .select("id", { count: "exact", head: true })
        .eq("is_voided", false)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

  // Calculate profile stats - count ALL account types (investor + IB + fees_account)
  // Exclude pure admin accounts (is_admin=true AND no account_type role)
  const allProfiles = (profilesResult.data || []) as ProfileData[];
  const profiles = allProfiles.filter(
    (p) =>
      p.account_type === "investor" || p.account_type === "ib" || p.account_type === "fees_account"
  );
  const totalProfiles = profiles.length;
  const activeProfiles = profiles.filter((p) => p.status === "active").length;

  // Calculate position stats
  const positions = (positionsResult.data || []) as PositionData[];
  const totalPositions = positions.length;
  const activePositions = positions.filter((p) => (p.current_value || 0) > 0);
  // Only count investors with active positions (current_value > 0)
  const uniqueInvestorIds = new Set(activePositions.map((p) => p.investor_id));
  const uniqueInvestorsWithPositions = uniqueInvestorIds.size;

  return {
    totalFunds: fundsResult.count || 0,
    totalPositions,
    activePositions: activePositions.length,
    totalProfiles,
    activeProfiles,
    uniqueInvestorsWithPositions,
    pendingWithdrawals: withdrawalsResult.count || 0,
    recentActivity: activityResult.count || 0,
  };
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
