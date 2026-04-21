/**
 * Investor Performance Service
 * Handles updating investor fund performance data via canonical RPC
 * with balance equation validation and audit trail.
 */

import { supabase } from "@/integrations/supabase/client";

export interface PerformanceUpdateData {
  mtd_beginning_balance: number;
  mtd_ending_balance: number;
  mtd_additions: number;
  mtd_redemptions: number;
  mtd_net_income: number;
}

/**
 * Update fund performance data for an investor via canonical RPC.
 * Validates balance equation: ending = beginning + additions - redemptions + net_income
 * Logs to audit_log with admin user and reason.
 */
export async function updateFundPerformance(
  performanceId: string,
  data: PerformanceUpdateData
): Promise<void> {
  const expected =
    data.mtd_beginning_balance + data.mtd_additions - data.mtd_redemptions + data.mtd_net_income;
  const delta = Math.abs(data.mtd_ending_balance - expected);
  if (delta > 0.01) {
    throw new Error(
      `Balance equation violation: expected ending ${expected.toFixed(4)}, got ${data.mtd_ending_balance.toFixed(4)} (delta: ${delta.toFixed(4)})`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: result, error } = await supabase.rpc("update_investor_fund_performance", {
    p_performance_id: performanceId,
    p_admin_id: user.id,
    p_mtd_beginning_balance: data.mtd_beginning_balance,
    p_mtd_ending_balance: data.mtd_ending_balance,
    p_mtd_additions: data.mtd_additions,
    p_mtd_redemptions: data.mtd_redemptions,
    p_mtd_net_income: data.mtd_net_income,
    p_reason: "Admin update via UI",
  });

  if (error) throw error;

  const typedResult = result as { success?: boolean; message?: string } | null;
  if (typedResult && typedResult.success === false) {
    throw new Error(typedResult.message || "Failed to update performance data");
  }
}
