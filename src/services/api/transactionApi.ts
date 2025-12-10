import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type TransactionRow = any;
type TxType = Database["public"]["Enums"]["tx_type"];

export interface TransactionFilter {
  userId?: string;
  portfolioId?: string;
  assetId?: string;
  txnType?: TxType | string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionSummary {
  totalCount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalFees: number;
  recentTransactions: TransactionRow[];
}

/**
 * Transaction API - Strongly typed fetching of transaction history
 */
export async function fetchTransactions(filter: TransactionFilter = {}): Promise<{
  data: TransactionRow[];
  count: number;
}> {
  try {
    let query = supabase.from("transactions_v2").select("*", { count: "exact" });

    // Apply filters

    // 1. User Filter (userId IS profile_id / investor_id now)
    if (filter.userId) {
      // No need to lookup investor.id from investors table anymore
      query = query.eq("investor_id", filter.userId);
    }

    if (filter.txnType) {
      query = query.eq("type", filter.txnType as TxType);
    }

    if (filter.assetId) {
      query = query.eq("asset", filter.assetId);
    }

    if (filter.startDate) {
      query = query.gte("created_at", filter.startDate);
    }

    if (filter.endDate) {
      query = query.lte("created_at", filter.endDate);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .limit(filter.limit || 50);

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return { data: [], count: 0 };
  }
}

// Implementations for Phase 2
export async function fetchTransactionById(id: string): Promise<any> {
  const { data, error } = await supabase.from("transactions_v2").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}

export async function createTransactionRecord(transaction: any): Promise<any> {
  const { data, error } = await supabase
    .from("transactions_v2")
    .insert(transaction)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTransactionRecord(id: string, updates: any): Promise<any> {
  const { data, error } = await supabase
    .from("transactions_v2")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransactionRecord(id: string): Promise<void> {
  const { error } = await supabase.from("transactions_v2").delete().eq("id", id);

  if (error) throw error;
}

export async function fetchTransactionSummary(userId: string): Promise<TransactionSummary> {
  try {
    // userId IS the investor_id now (One ID)
    const investorId = userId;

    const { data: transactions, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("investor_id", investorId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const summary = {
      totalCount: transactions.length,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalFees: 0,
      recentTransactions: transactions.slice(0, 5) as TransactionRow[],
    };

    transactions.forEach((t: any) => {
      const amt = Number(t.amount || 0);
      if (t.type === "DEPOSIT") summary.totalDeposits += amt;
      else if (t.type === "WITHDRAWAL") summary.totalWithdrawals += amt;
      else if (t.type === "FEE") summary.totalFees += amt;
    });

    return summary;
  } catch (error) {
    console.error("Error fetching transaction summary:", error);
    return {
      totalCount: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalFees: 0,
      recentTransactions: [],
    };
  }
}

/**
 * Error handling wrapper for transaction API calls
 */
export function withTransactionErrorHandling<T extends any[], R>(fn: (...args: T) => Promise<R>) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error("Transaction API Error:", error);
      throw error;
    }
  };
}

// API object for easy consumption
const getTransactionHistory = async (_userId: string, options: any = {}) => {
  try {
    const data = await fetchTransactions({ ...options });
    return { data: data.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const createTransaction = async (_userId: string, transactionData: any) => {
  try {
    const data = await createTransactionRecord(transactionData);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const updateTransaction = async (transactionId: string, updates: any) => {
  try {
    const data = await updateTransactionRecord(transactionId, updates);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const deleteTransaction = async (transactionId: string) => {
  try {
    await deleteTransactionRecord(transactionId);
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const getTransactionById = async (transactionId: string) => {
  try {
    const data = await fetchTransactionById(transactionId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const transactionApi = {
  getTransactionHistory,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionById,
};

// Export wrapped functions for additional error handling
export const safeFetchTransactions = withTransactionErrorHandling(fetchTransactions);
export const safeFetchTransactionById = withTransactionErrorHandling(fetchTransactionById);
export const safeFetchTransactionSummary = withTransactionErrorHandling(fetchTransactionSummary);

export default transactionApi;
