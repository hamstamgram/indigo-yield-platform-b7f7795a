/**
 * Action Bar Service
 * Handles fetching pending counts for the admin action bar
 */

import { supabase } from "@/integrations/supabase/client";

export interface PendingCounts {
  withdrawals: number;
  reportsNeeded: number;
}

/**
 * Fetch pending counts for the action bar
 */
export async function fetchPendingCounts(): Promise<PendingCounts> {
  // Fetch pending withdrawals
  const { count: withdrawalCount } = await supabase
    .from("withdrawal_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Fetch investors without reports for current month
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1;

  const { count: investorCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_admin", false);

  // First lookup the period_id UUID from statement_periods
  const { data: periodData } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", currentYear)
    .eq("month", currentMonthNum)
    .maybeSingle();

  let reportCount = 0;
  if (periodData?.id) {
    const { count } = await supabase
      .from("investor_fund_performance")
      .select("investor_id", { count: "exact", head: true })
      .eq("period_id", periodData.id);
    reportCount = count || 0;
  }

  return {
    withdrawals: withdrawalCount || 0,
    reportsNeeded: Math.max(0, (investorCount || 0) - reportCount),
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
