/**
 * Investor Lifecycle Service
 * Handles investor status management, position locking, and cleanup operations
 */

import { supabase } from "@/integrations/supabase/client";
import { InvestorStatus } from "@/types/domains/investor";

// Re-export for backwards compatibility
export type { InvestorStatus };

export interface CleanupResult {
  archivedCount: number;
  profiles: string[];
}

/**
 * Update an investor's status
 */
export async function updateInvestorStatus(
  investorId: string,
  status: InvestorStatus
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", investorId);

  if (error) throw error;
}

/**
 * Locking is disabled: all capital is always liquid.
 */
export async function lockPositions(
  investorId: string,
  lockUntil: string,
  _reason?: string
): Promise<void> {
  throw new Error("Position locking is disabled. All capital is always liquid.");
}

/**
 * Get the count of pending withdrawals for an investor
 */
export async function getPendingWithdrawalsCount(investorId: string): Promise<number> {
  const { count, error } = await supabase
    .from("withdrawal_requests")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", investorId)
    .eq("status", "pending");

  if (error) throw error;
  return count || 0;
}

/**
 * Cleanup inactive investors by archiving them
 * Criteria: inactive for 90+ days, zero balance, not admin
 */
export async function cleanupInactiveInvestors(): Promise<CleanupResult> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Get profiles with zero balance and inactive for 90+ days
  const { data: inactiveProfiles, error: fetchError } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      last_name,
      email,
      updated_at,
      investor_positions!left (
        current_value
      )
    `)
    .eq("status", "inactive")
    .eq("is_admin", false)
    .lt("updated_at", ninetyDaysAgo);

  if (fetchError) throw fetchError;

  const profilesToCleanup =
    inactiveProfiles?.filter((profile) =>
      profile.investor_positions.every((pos: any) => pos.current_value <= 0)
    ) || [];

  if (profilesToCleanup.length === 0) {
    return { archivedCount: 0, profiles: [] };
  }

  // Archive profiles
  const archivedIds: string[] = [];
  for (const profile of profilesToCleanup) {
    const { error } = await supabase
      .from("profiles")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (!error) {
      archivedIds.push(profile.id);
    } else {
      console.error(`Failed to archive profile ${profile.id}:`, error);
    }
  }

  return {
    archivedCount: archivedIds.length,
    profiles: archivedIds,
  };
}
