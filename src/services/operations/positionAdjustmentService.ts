import { supabase } from "@/integrations/supabase/client";

export async function adjustPosition(
  input: { 
    investor_id: string; 
    fund_id: string; 
    delta: number; 
    note?: string;
    tx_type?: string;
    tx_date?: string;
  },
  adminId: string
) {
  const { investor_id, fund_id, delta, note, tx_type, tx_date } = input;
  const rpcCall = (supabase.rpc as any).bind(supabase);
  const { data, error } = await rpcCall("adjust_investor_position", {
    p_investor_id: investor_id,
    p_fund_id: fund_id,
    p_delta: delta,
    p_note: note || "",
    p_admin_id: adminId,
    p_tx_type: tx_type || "ADJUSTMENT",
    p_tx_date: tx_date || new Date().toISOString().split('T')[0],
  });
  if (error) {
    console.error("adjustPosition error", error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function createAdjustment(
  investorId: string,
  fundId: string,
  amount: number,
  type: "Credit" | "Debit",
  notes: string
) {
  const { data: fund, error: fundError } = await supabase
    .from("funds")
    .select("asset")
    .eq("id", fundId)
    .single();

  if (fundError || !fund) {
    console.error("Error fetching fund for adjustment:", fundError?.message || "Fund not found");
    return null;
  }

  const { data, error } = await supabase
    .from("transactions_v2")
    .insert([
      {
        investor_id: investorId,
        fund_id: fundId,
        asset: fund.asset,
        amount: type === "Credit" ? amount : -amount,
        type: "ADJUSTMENT",
        notes: notes,
      },
    ])
    .select();

  if (error) {
    console.error("Error creating adjustment:", error);
    return null;
  }
  return data;
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
