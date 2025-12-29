/**
 * Transactions V2 Service
 * Handles transaction queries for investors
 */

import { supabase } from "@/integrations/supabase/client";

export interface TransactionV2 {
  id: string;
  investor_id: string;
  fund_id: string | null;
  type: string;
  asset: string;
  amount: number;
  tx_date: string;
  notes: string | null;
  tx_hash: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface TransactionFilters {
  search?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

class TransactionsV2Service {
  /**
   * Get transactions by investor ID
   */
  async getByInvestorId(investorId: string, filters?: TransactionFilters): Promise<TransactionV2[]> {
    let query = supabase
      .from("transactions_v2")
      .select("*")
      .eq("investor_id", investorId)
      .order("tx_date", { ascending: false })
      .order("id", { ascending: false });

    if (filters?.search) {
      query = query.or(`asset.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }

    if (filters?.type) {
      query = query.eq("type", filters.type as any);
    }

    if (filters?.startDate) {
      query = query.gte("tx_date", filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte("tx_date", filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as TransactionV2[];
  }

  /**
   * Get a single transaction by ID
   */
  async getById(transactionId: string): Promise<TransactionV2 | null> {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (error) throw error;
    return data as TransactionV2 | null;
  }

  /**
   * Void a transaction via RPC (proper voiding with audit trail)
   * This calls the void_transaction RPC which:
   * - Sets is_voided = true
   * - Records void_reason, voided_at, voided_by
   * - Recomputes investor position
   * - Writes audit log entry
   */
  async voidTransaction(transactionId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc("void_transaction", {
      p_transaction_id: transactionId,
      p_reason: reason,
    });

    if (error) {
      console.error("Error voiding transaction:", error);
      throw new Error(error.message || "Failed to void transaction");
    }
  }

  /**
   * Get transaction summary for an investor
   */
  async getSummary(investorId: string): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    totalYield: number;
    transactionCount: number;
  }> {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("type, amount")
      .eq("investor_id", investorId);

    if (error) throw error;

    const summary = {
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalYield: 0,
      transactionCount: data?.length || 0,
    };

    data?.forEach((tx) => {
      const type = (tx.type || "").toUpperCase();
      const amount = Number(tx.amount);

      if (type === "DEPOSIT") {
        summary.totalDeposits += amount;
      } else if (type === "WITHDRAWAL") {
        summary.totalWithdrawals += Math.abs(amount);
      } else if (type === "YIELD" || type === "INTEREST") {
        summary.totalYield += amount;
      }
    });

    return summary;
  }
}

export const transactionsV2Service = new TransactionsV2Service();
