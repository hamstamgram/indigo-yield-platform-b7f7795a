import { supabase } from "@/integrations/supabase/client";

export async function adjustPosition(
  input: { investor_id: string; fund_id: string; delta: number; note?: string },
  adminId: string
) {
  const { investor_id, fund_id, delta, note } = input;
  const rpcCall = (supabase.rpc as any).bind(supabase);
  const { data, error } = await rpcCall("adjust_investor_position", {
    p_investor_id: investor_id,
    p_fund_id: fund_id,
    p_delta: delta,
    p_note: note || "",
    p_admin_id: adminId,
  });
  if (error) {
    console.error("adjustPosition error", error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

// Simple fetch for a position to adjust
export async function getPositionForAdjustment(investorId: string, fundId: string) {
  const { data, error } = await supabase
    .from("investor_positions")
    .select("investor_id, fund_id, current_value, shares, fund_class")
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .maybeSingle();
  if (error) {
    console.error("getPositionForAdjustment error", error);
    return null;
  }
  return data;
}

export async function getFundAdjustmentHistory(fundId?: string) {
  // No dedicated table; rely on transactions_v2 type ADJUSTMENT
  let query = supabase
    .from("transactions_v2")
    .select("*")
    .eq("type", "ADJUSTMENT")
    .order("created_at", { ascending: false })
    .limit(100);
  if (fundId) {
    query = query.eq("fund_id", fundId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("getFundAdjustmentHistory error", error);
    return [];
  }
  return data;
}
