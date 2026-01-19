/**
 * Transactions V2 Service
 * Handles transaction queries for investors
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";
import { logError } from "@/lib/logger";

export interface TransactionRecord {
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

/** @deprecated Use TransactionRecord instead */
export type TransactionV2 = TransactionRecord;

export interface TransactionFilters {
  search?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

class TransactionsRecordService {
  /**
   * Get transactions by investor ID
   */
  async getByInvestorId(
    investorId: string,
    filters?: TransactionFilters
  ): Promise<TransactionRecord[]> {
    let query = supabase
      .from("transactions_v2")
      .select("*")
      .eq("investor_id", investorId)
      .eq("is_voided", false)
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
    return (data || []) as TransactionRecord[];
  }

  /**
   * Get a single transaction by ID
   */
  async getById(transactionId: string): Promise<TransactionRecord | null> {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (error) throw error;
    return data as TransactionRecord | null;
  }

  /**
   * Void a transaction via RPC (proper voiding with audit trail)
   * This calls the void_transaction RPC which:
   * - Sets is_voided = true
   * - Records void_reason, voided_at, voided_by
   * - Recomputes investor position
   * - Writes audit log entry
   */
  /**
   * Void a transaction via RPC
   * Canonical signature: void_transaction(p_transaction_id uuid, p_admin_id uuid, p_reason text)
   */
  async voidTransaction(transactionId: string, reason: string): Promise<void> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user?.id) throw new Error("Authentication required");

    const { data, error } = await rpc.call("void_transaction", {
      p_transaction_id: transactionId,
      p_admin_id: user.id,
      p_reason: reason,
    });

    if (error) {
      logError("transactionsV2Service.voidTransaction", error, { transactionId });
      throw new Error(error.message || "Failed to void transaction");
    }

    // Check RPC result for success
    const result = data as any;
    if (result && result.success === false) {
      throw new Error(result.message || result.error_code || "Failed to void transaction");
    }
  }

  /**
   * Get void impact preview - shows what will happen before voiding
   */
  async getVoidImpact(transactionId: string): Promise<{
    success: boolean;
    error?: string;
    transaction_type?: string;
    transaction_amount?: number;
    transaction_date?: string;
    current_position?: number;
    projected_position?: number;
    position_change?: number;
    would_go_negative?: boolean;
    aum_records_affected?: number;
    related_records?: { type: string; count: number }[];
    is_system_generated?: boolean;
  }> {
    const { data, error } = await rpc.call("get_void_transaction_impact", {
      p_transaction_id: transactionId,
    });

    if (error) {
      logError("transactionsV2Service.getVoidImpact", error, { transactionId });
      throw new Error(error.message || "Failed to get void impact");
    }

    return data as any;
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
      .eq("investor_id", investorId)
      .eq("is_voided", false);

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

export const transactionsV2Service = new TransactionsRecordService();
