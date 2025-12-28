import { supabase } from "@/integrations/supabase/client";

export interface CreateTransactionParams {
  investorId: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  fundId: string;
  description?: string;
  txHash?: string;
}

export const adminTransactionService = {
  async createTransaction(params: CreateTransactionParams) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const delta = params.type === "DEPOSIT" ? params.amount : -params.amount;
    const note = params.description || `${params.type} transaction`;
    
    // Generate unique reference_id to prevent duplicates
    const referenceId = `manual:${params.fundId}:${params.investorId}:${new Date().toISOString().split('T')[0]}:${crypto.randomUUID()}`;

    // Use the canonical 8-param signature with reference_id
    const { data, error } = await (supabase.rpc as any)("adjust_investor_position", {
      p_investor_id: params.investorId,
      p_fund_id: params.fundId,
      p_delta: delta,
      p_note: note,
      p_admin_id: user.id,
      p_tx_type: params.type,
      p_tx_date: new Date().toISOString().split('T')[0],
      p_reference_id: referenceId,
    });

    if (error) {
      const errorMessage = error.message || error.details || "Failed to create transaction";
      throw new Error(errorMessage);
    }
    return data;
  },
};
