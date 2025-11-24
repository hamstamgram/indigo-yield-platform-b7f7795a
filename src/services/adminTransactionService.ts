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
    const { data, error } = await (supabase as any).rpc("admin_create_transaction", {
      p_investor_id: params.investorId,
      p_type: params.type,
      p_amount: params.amount,
      p_fund_id: params.fundId,
      p_description: params.description,
      p_tx_hash: params.txHash,
    });

    if (error) throw error;
    return data;
  },
};
