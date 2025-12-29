/**
 * Investor Performance Service
 * Handles updating investor fund performance data
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
 * Update fund performance data for an investor
 */
export async function updateFundPerformance(
  performanceId: string,
  data: PerformanceUpdateData
): Promise<void> {
  const { error } = await supabase
    .from("investor_fund_performance")
    .update({
      mtd_beginning_balance: data.mtd_beginning_balance,
      mtd_ending_balance: data.mtd_ending_balance,
      mtd_additions: data.mtd_additions,
      mtd_redemptions: data.mtd_redemptions,
      mtd_net_income: data.mtd_net_income,
      updated_at: new Date().toISOString(),
    })
    .eq("id", performanceId);

  if (error) throw error;
}
