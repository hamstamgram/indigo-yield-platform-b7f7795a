import { supabase } from "@/integrations/supabase/client";
import { type InvestmentFormData } from "@/types/investment";

export const investmentService = {
  async createInvestment(data: InvestmentFormData) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    // Map transaction type
    const type = data.transaction_type === 'redemption' ? 'WITHDRAWAL' : 'DEPOSIT';
    const amount = data.transaction_type === 'redemption' ? -Math.abs(data.amount) : Math.abs(data.amount);

    // Get fund asset for transaction record
    const { data: fund } = await supabase
      .from("funds")
      .select("asset, fund_class")
      .eq("id", data.fund_id)
      .single();

    const { error } = await supabase.from("transactions_v2").insert({
      investor_id: data.investor_id,
      fund_id: data.fund_id,
      type: type,
      amount: amount,
      status: "pending",
      tx_date: data.investment_date,
      value_date: data.investment_date,
      asset: fund?.asset || "UNKNOWN",
      fund_class: fund?.fund_class || "Class A",
      notes: data.notes,
      reference_id: data.reference_number,
      created_by: user?.id,
    } as any);

    if (error) throw error;
    return { success: true };
  },

  async approveInvestment(id: string, shares: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Get transaction details
    const { data: tx, error: fetchError } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    if (!tx) throw new Error("Transaction not found");

    const amount = Number(tx.amount);

    // 2. Update transaction status
    const { error: updateError } = await supabase
      .from("transactions_v2")
      .update({
        status: "completed",
        // Store shares in metadata or notes if no column? 
        // transactions_v2 doesn't have 'shares' column in V2 schema unless added.
        // We will just update the position.
      } as any)
      .eq("id", id);

    if (updateError) throw updateError;

    // 3. Update Investor Position
    // We need to upsert.
    const { data: position } = await supabase
      .from("investor_positions")
      .select("*")
      .eq("investor_id", tx.investor_id)
      .eq("fund_id", tx.fund_id)
      .maybeSingle();

    if (position) {
      await supabase
        .from("investor_positions")
        .update({
          shares: Number(position.shares || 0) + shares,
          cost_basis: Number(position.cost_basis || 0) + amount,
          current_value: Number(position.current_value || 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("investor_id", tx.investor_id)
        .eq("fund_id", tx.fund_id);
    } else {
      await supabase.from("investor_positions").insert({
        investor_id: tx.investor_id,
        fund_id: tx.fund_id,
        shares: shares,
        cost_basis: amount,
        current_value: amount,
        updated_at: new Date().toISOString(),
      });
    }

    return { success: true };
  },

  async rejectInvestment(id: string, reason: string) {
    const { error } = await supabase
      .from("transactions_v2")
      .update({
        status: "rejected",
        notes: reason ? `Rejected: ${reason}` : "Rejected",
      } as any)
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  },
};
