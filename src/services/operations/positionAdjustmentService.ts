import { supabase } from "@/integrations/supabase/client";
import { toDecimal } from "@/utils/financial";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { getTodayString } from "@/utils/dateUtils";

/**
 * Position Adjustment Service
 *
 * IMPORTANT: All position adjustments MUST go through the canonical
 * adjust_investor_position RPC to ensure atomic transaction + position
 * updates with invariant checks.
 */

/**
 * Adjust an investor's position using the canonical RPC
 * This is the ONLY way to safely modify positions
 */
export async function adjustPosition(
  input: {
    investor_id: string;
    fund_id: string;
    delta: string | number;
    note?: string;
    type?: string;
    tx_date?: string;
  },
  adminId: string
) {
  const { investor_id, fund_id, delta, note, type, tx_date } = input;
  const deltaFixed = Number(toDecimal(delta).toFixed(10));
  const { data, error } = await callRPC("adjust_investor_position", {
    p_investor_id: investor_id,
    p_fund_id: fund_id,
    p_delta: deltaFixed,
    p_note: note || "",
    p_admin_id: adminId,
    p_tx_type: type || "ADJUSTMENT",
    p_tx_date: tx_date || getTodayString(),
    p_reference_id: `adj:${fund_id}:${investor_id}:${Date.now()}`,
  });
  if (error) {
    logError("adjustPosition", error, { investor_id, fund_id, delta });
    return { success: false, error: error.message };
  }

  // DB returns: { transaction_id, old_balance, new_balance } - not out_* prefixed
  const result = (
    data as Array<{ transaction_id: string; old_balance: number; new_balance: number }>
  )?.[0];
  if (!result?.transaction_id) {
    return { success: false, error: "No transaction created" };
  }

  return {
    success: true,
    data: {
      transactionId: result.transaction_id,
      oldBalance: result.old_balance,
      newBalance: result.new_balance,
    },
  };
}

/**
 * Get a position for adjustment display
 */
export async function getPositionForAdjustment(investorId: string, fundId: string) {
  const { data, error } = await supabase
    .from("investor_positions")
    .select("investor_id, fund_id, current_value, shares, fund_class")
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .maybeSingle();
  if (error) {
    logError("getPositionForAdjustment", error, { investorId, fundId });
    return null;
  }
  return data;
}

/**
 * Get fund adjustment history from transactions
 */
export async function getFundAdjustmentHistory(fundId?: string) {
  let query = supabase
    .from("transactions_v2")
    .select("*")
    .eq("type", "ADJUSTMENT")
    .eq("is_voided", false)
    .order("created_at", { ascending: false })
    .limit(100);
  if (fundId) {
    query = query.eq("fund_id", fundId);
  }
  const { data, error } = await query;
  if (error) {
    logError("getFundAdjustmentHistory", error, { fundId });
    return [];
  }
  return data;
}

/**
 * Reconcile all positions from ledger (admin only)
 * Runs a dry-run by default - pass false to actually fix positions
 */
export async function reconcileAllPositions(dryRun: boolean = true) {
  const { data, error } = await callRPC("reconcile_all_positions", {
    p_dry_run: dryRun,
  });

  if (error) {
    logError("reconcileAllPositions", error, { dryRun });
    return { success: false, error: error.message, mismatches: [] };
  }

  return { success: true, mismatches: data || [] };
}

/**
 * Recompute a single investor's position from ledger
 */
export async function recomputePosition(investorId: string, fundId: string) {
  const { error } = await callRPC("recompute_investor_position", {
    p_investor_id: investorId,
    p_fund_id: fundId,
  });

  if (error) {
    logError("recomputePosition", error, { investorId, fundId });
    return { success: false, error: error.message };
  }

  return { success: true };
}
