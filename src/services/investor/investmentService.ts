import { supabase } from "@/integrations/supabase/client";
import { adjustInvestorPosition, recomputeInvestorPosition } from "@/lib/supabase/typedRpc";
import { type InvestmentFormData } from "@/types/domains";

export const investmentService = {
  /**
   * Create investment using canonical adjust_investor_position RPC
   * This ensures atomic transaction + position update with invariant checks
   */
  async createInvestment(data: InvestmentFormData) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    // Map transaction type
    const type = data.transaction_type === 'redemption' ? 'WITHDRAWAL' : 'DEPOSIT';
    const amount = Math.abs(data.amount);
    const delta = type === 'DEPOSIT' ? amount : -amount;

    // Get fund asset for transaction record
    const { data: fund } = await supabase
      .from("funds")
      .select("asset, fund_class")
      .eq("id", data.fund_id)
      .maybeSingle();

    if (!fund) {
      throw new Error(`Fund not found: ${data.fund_id}`);
    }

    const txDate = data.investment_date || new Date().toISOString().split("T")[0];
    
    // Generate unique reference_id for idempotency
    const referenceId = data.reference_number || 
      `investment:${data.fund_id}:${data.investor_id}:${txDate}:${crypto.randomUUID()}`;

    // Use canonical adjust_investor_position RPC for atomic transaction + position update
    const { data: result, error } = await adjustInvestorPosition({
      p_investor_id: data.investor_id,
      p_fund_id: data.fund_id,
      p_delta: delta,
      p_note: data.notes || `${type} investment`,
      p_admin_id: user?.id || null,
      p_tx_type: type,
      p_tx_date: txDate,
      p_reference_id: referenceId,
    });

    if (error) {
      console.error("adjust_investor_position error:", error);
      throw new Error(error.message || "Failed to create investment");
    }

    const rpcResult = result?.[0];
    if (!rpcResult?.out_success) {
      throw new Error(rpcResult?.out_message || "Failed to create investment");
    }

    return { success: true, transactionId: rpcResult.out_transaction_id };
  },

  /**
   * Approve a pending investment
   * Updates the transaction status and ensures position is in sync
   */
  async approveInvestment(id: string, shares: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Get transaction details
    const { data: tx, error: fetchError } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!tx) throw new Error("Transaction not found");

    // 2. Update transaction status
    const { error: updateError } = await supabase
      .from("transactions_v2")
      .update({
        status: "completed",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      } as any)
      .eq("id", id);

    if (updateError) throw updateError;

    // 3. Recompute position from ledger to ensure consistency
    await recomputeInvestorPosition({
      p_investor_id: tx.investor_id,
      p_fund_id: tx.fund_id,
    });

    return { success: true };
  },

  /**
   * Reject an investment
   */
  async rejectInvestment(id: string, reason: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("transactions_v2")
      .update({
        status: "rejected",
        notes: reason,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      } as any)
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  },
};
