/**
 * AUM Reconciliation Service
 * Check for discrepancies between positions sum and recorded AUM
 */

import { supabase } from "@/integrations/supabase/client";

export interface AUMReconciliationResult {
  success: boolean;
  error?: string;
  fund_id: string;
  fund_asset: string;
  positions_sum: number;
  recorded_aum: number;
  aum_date: string | null;
  discrepancy: number;
  discrepancy_pct: number;
  tolerance_pct: number;
  has_warning: boolean;
  message: string;
}

/**
 * Check AUM reconciliation for a fund
 * Compares sum of investor positions vs latest recorded fund AUM
 */
export async function checkAUMReconciliation(
  fundId: string,
  tolerancePct: number = 0.01
): Promise<AUMReconciliationResult> {
  const { data, error } = await supabase.rpc("check_aum_reconciliation", {
    p_fund_id: fundId,
    p_tolerance_pct: tolerancePct,
  });

  if (error) throw error;
  return data as unknown as AUMReconciliationResult;
}
