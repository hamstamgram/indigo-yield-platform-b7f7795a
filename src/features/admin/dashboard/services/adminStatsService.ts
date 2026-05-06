/**
 * Admin Stats Service
 * Handles fetching dashboard statistics for admin users
 */

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

  return data as unknown as AdminStats;
}
