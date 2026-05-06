/**
 * Action Bar Service
 * Uses gateway RPC get_admin_pending_counts instead of direct supabase.from() calls
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";

export interface PendingCounts {
  withdrawals: number;
  reportsNeeded: number;
}

/**
 * Fetch pending counts for the action bar
 * Single RPC call replaces 4 direct supabase.from() queries
 */
export async function fetchPendingCounts(): Promise<PendingCounts> {
  const { data, error } = await rpc.callNoArgs("get_admin_pending_counts");

  if (error || !data || data.length === 0) {
    return { withdrawals: 0, reportsNeeded: 0 };
  }

  return {
    withdrawals: Number(data[0].withdrawal_count) || 0,
    reportsNeeded: Number(data[0].reports_needed) || 0,
  };
}

/**
 * Subscribe to withdrawal request changes
 */
export function subscribeToWithdrawalChanges(callback: () => void) {
  const channel = supabase
    .channel("action-bar-updates")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "withdrawal_requests" },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export const actionBarService = {
  fetchPendingCounts,
  subscribeToWithdrawalChanges,
};
