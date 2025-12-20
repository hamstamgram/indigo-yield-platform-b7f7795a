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

    // Use the robust adjustment RPC which handles position updates and transaction logging
    const { data, error } = await (supabase.rpc as any)("adjust_investor_position", {
      p_investor_id: params.investorId,
      p_fund_id: params.fundId,
      p_delta: delta,
      p_note: note,
      p_admin_id: user.id
    });

    if (error) throw error;
    return data;
  },
};
