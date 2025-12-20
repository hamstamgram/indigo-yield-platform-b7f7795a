import { supabase } from "@/integrations/supabase/client";

export interface Transaction {
  id: string;
  investor_id: string;
  txn_type: string | null;
  asset: string;
  amount: number;
  type: string;
  tx_date: string; // V2 schema uses tx_date
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // user.id IS the investor_id now (One ID)
    const investorId = user.id;

    // Fetch transactions for this investor, directly joining with profiles for name
    const { data, error } = await supabase
      .from("transactions_v2")
      .select(
        `
        id,
        investor_id,
        type,
        asset,
        amount,
        tx_date,
        created_at,
        notes,
        profile:profiles(first_name, last_name, email)
      `
      )
      .eq("investor_id", investorId)
      .order("tx_date", { ascending: false })
      .order("id", { ascending: false }) // Deterministic tie-breaker for same-day ordering
      .limit(100);

    if (error) throw error;

    return (data || []).map((tx) => {
      const profile = (tx as any).profile;
      const investor_name = profile?.first_name || profile?.last_name
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : profile?.email || "Unknown";

      return {
        id: tx.id,
        investor_id: tx.investor_id,
        txn_type: tx.type,
        asset: tx.asset,
        amount: tx.amount,
        type: tx.type,
        tx_date: tx.tx_date, // V2 schema uses tx_date
        created_at: tx.created_at,
        notes: tx.notes,
        investor_name: investor_name,
      };
    });
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

/**
 * Create a transaction (admin use)
 */
export interface CreateTransactionParams {
  investorId: string;
  fundId: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "YIELD" | "INTEREST" | "FEE";
  asset: string;
  amount: number;
  txDate: string;
  referenceId?: string;
  txHash?: string;
  notes?: string;
}

export async function createAdminTransaction(
  params: CreateTransactionParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be logged in to create transactions" };
    }

    const { error } = await supabase.from("transactions_v2").insert({
      investor_id: params.investorId,
      fund_id: params.fundId,
      type: params.type as any,
      txn_type: params.type,
      asset: params.asset,
      amount: params.amount,
      tx_date: params.txDate,
      value_date: params.txDate,
      reference_id: params.referenceId || null,
      tx_hash: params.txHash || null,
      notes: params.notes || null,
      created_by: user.id,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error creating transaction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create transaction",
    };
  }
}

export const transactionService = {
  fetchUserTransactions,
  calculateTransactionSummary,
  createAdminTransaction,
};
