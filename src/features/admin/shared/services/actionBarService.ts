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

  // Fetch investors with active positions who need reports for current month
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1;

  // Count investors with active positions (value > 0)
  // These are the only investors who need monthly reports
  const { data: activeInvestors } = await supabase
    .from("investor_positions")
    .select("investor_id")
    .eq("is_active", true)
    .gt("current_value", 0);

  const uniqueActiveInvestors = [...new Set(activeInvestors?.map((p) => p.investor_id) || [])];
  const investorCount = uniqueActiveInvestors.length;

  // First lookup the period_id UUID from statement_periods
  const { data: periodData } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", currentYear)
    .eq("month", currentMonthNum)
    .maybeSingle();

  let reportCount = 0;
  if (periodData?.id && uniqueActiveInvestors.length > 0) {
    const { count } = await supabase
      .from("investor_fund_performance")
      .select("investor_id", { count: "exact", head: true })
      .eq("period_id", periodData.id)
      .in("investor_id", uniqueActiveInvestors);
    reportCount = count || 0;
  }

  return {
    withdrawals: withdrawalCount || 0,
    reportsNeeded: Math.max(0, investorCount - reportCount),
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
