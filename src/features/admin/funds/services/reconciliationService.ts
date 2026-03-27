/**
 * Reconciliation Service
 * Service layer for database reconciliation functions
 */

import { rpc } from "@/lib/rpc/index";

/**
 * Result from get_void_yield_impact RPC
 */
export interface VoidYieldImpactResult {
  distribution_id: string;
  fund_id: string;
  gross_yield_amount: number;
  period_start: string;
  period_end: string;
  affected_investors: number;
  total_investor_yield: number;
  total_fees: number;
  total_ib_commissions: number;
  transaction_count: number;
  investors: Array<{
    investor_id: string;
    investor_name: string;
    yield_amount: number;
    fee_amount: number;
  }>;
}

/**
 * Get the impact of voiding a yield distribution
 * Shows affected investors, amounts, fees, etc.
 */
export async function getVoidYieldImpact(distributionId: string): Promise<VoidYieldImpactResult> {
  const { data, error } = await rpc.call("get_void_yield_impact", {
    p_distribution_id: distributionId,
  });

  if (error) throw error;
  return data as unknown as VoidYieldImpactResult;
}

/**
 * Force delete an investor and all related data
 * Only callable by super admins
 */
export async function forceDeleteInvestor(investorId: string): Promise<boolean> {
  const { data, error } = await rpc.call("force_delete_investor", {
    p_investor_id: investorId,
    p_admin_id: "system",
  });

  if (error) throw error;
  return data as boolean;
}
