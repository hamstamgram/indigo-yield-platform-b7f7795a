import { supabase } from "@/integrations/supabase/client";

export interface Transaction {
  id: string;
  investor_id: string;
  txn_type: string | null;
  asset: string;
  amount: number;
  type: string;
  occurred_at: string;
  created_at: string | null;
  investor_name?: string;
  notes?: string | null;
}

export interface TransactionSummary {
  totalCount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingCount: number;
}

/**
 * Fetch transactions for the current user's investor record
 */
export async function fetchUserTransactions(): Promise<Transaction[]> {
  try {
    // First get the current user's investor_id
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get investor record for this user
    const { data: investor, error: investorError } = await supabase
      .from("investors")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (investorError) throw investorError;
    if (!investor) throw new Error("Investor record not found");

    // Fetch transactions for this investor
    const { data, error } = await supabase
      .from("transactions_v2")
      .select(
        `
        id,
        investor_id,
        txn_type,
        asset,
        amount,
        type,
        occurred_at,
        created_at,
        notes,
        investors!inner(name)
      `
      )
      .eq("investor_id", investor.id)
      .order("occurred_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data || []).map((tx) => ({
      id: tx.id,
      investor_id: tx.investor_id,
      txn_type: tx.txn_type,
      asset: tx.asset,
      amount: tx.amount,
      type: tx.type,
      occurred_at: tx.occurred_at,
      created_at: tx.created_at,
      notes: tx.notes,
      investor_name: (tx.investors as any)?.name,
    }));
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
}

/**
 * Calculate transaction summary statistics
 */
export async function calculateTransactionSummary(): Promise<TransactionSummary> {
  try {
    const transactions = await fetchUserTransactions();

    const summary: TransactionSummary = {
      totalCount: transactions.length,
      totalDeposits: 0,
      totalWithdrawals: 0,
      pendingCount: 0,
    };

    transactions.forEach((tx) => {
      const txType = (tx.txn_type || tx.type || "").toUpperCase();

      if (txType === "DEPOSIT") {
        summary.totalDeposits += Number(tx.amount);
      } else if (txType === "WITHDRAWAL") {
        summary.totalWithdrawals += Number(tx.amount);
      }
    });

    return summary;
  } catch (error) {
    console.error("Error calculating summary:", error);
    return {
      totalCount: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      pendingCount: 0,
    };
  }
}

export const transactionService = {
  fetchUserTransactions,
  calculateTransactionSummary,
};
