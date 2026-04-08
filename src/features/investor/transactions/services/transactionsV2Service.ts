/**
 * Transactions V2 Service
 * Handles transaction queries for investors
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { logError } from "@/lib/logger";
import { buildSafeOrFilter } from "@/utils/searchSanitizer";
import { parseFinancial } from "@/utils/financial";
import type { Database } from "@/integrations/supabase/types";

export interface TransactionRecord {
  id: string;
  investor_id: string;
  fund_id: string | null;
  type: string;
  asset: string;
  /** Amount - string for NUMERIC(28,10) precision */
  amount: string;
  tx_date: string;
  notes: string | null;
  tx_hash: string | null;
  reference_id: string | null;
  created_at: string;
  purpose: string | null;
  distribution_id: string | null;
}

export interface TransactionFilters {
  search?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Get transactions by investor ID
 */
export async function getByInvestorId(
  investorId: string,
  filters?: TransactionFilters
): Promise<TransactionRecord[]> {
  let query = supabase
    .from("transactions_v2")
    .select(
      "id, investor_id, fund_id, type, asset, amount, tx_date, notes, tx_hash, reference_id, created_at, purpose, distribution_id"
    )
    .eq("investor_id", investorId)
    .eq("is_voided", false)
    .eq("visibility_scope", "investor_visible")
    .order("tx_date", { ascending: false })
    .order("id", { ascending: false });

  if (filters?.search) {
    const safeFilter = buildSafeOrFilter(filters.search, ["asset", "notes"]);
    if (safeFilter) {
      query = query.or(safeFilter);
    }
  }

  if (filters?.type) {
    query = query.eq("type", filters.type as Database["public"]["Enums"]["tx_type"]);
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
  return (data || []).map((tx) => ({
    ...tx,
    amount: String(tx.amount),
  })) as TransactionRecord[];
}

/**
 * Get a single transaction by ID
 */
export async function getById(transactionId: string): Promise<TransactionRecord | null> {
  const { data, error } = await supabase
    .from("transactions_v2")
    .select(
      "id, investor_id, fund_id, type, asset, amount, tx_date, notes, tx_hash, reference_id, created_at, purpose, distribution_id"
    )
    .eq("id", transactionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...data, amount: String(data.amount) } as TransactionRecord;
}

/**
 * Void a transaction via RPC
 * Canonical signature: void_transaction(p_transaction_id uuid, p_admin_id uuid, p_reason text)
 */
export async function voidTransaction(transactionId: string, reason: string): Promise<void> {
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

  const result = data as { success?: boolean; message?: string; error_code?: string } | null;
  if (result && result.success === false) {
    throw new Error(result.message || result.error_code || "Failed to void transaction");
  }
}

/**
 * Get void impact preview - shows what will happen before voiding
 */
export async function getVoidImpact(transactionId: string): Promise<{
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
export async function getSummary(investorId: string): Promise<{
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

  let totalDeposits = parseFinancial(0);
  let totalWithdrawals = parseFinancial(0);
  let totalYield = parseFinancial(0);

  data?.forEach((tx) => {
    const type = (tx.type || "").toUpperCase();
    const amount = parseFinancial(tx.amount);

    if (type === "DEPOSIT") {
      totalDeposits = totalDeposits.plus(amount);
    } else if (type === "WITHDRAWAL") {
      totalWithdrawals = totalWithdrawals.plus(amount.abs());
    } else if (type === "YIELD" || type === "FEE_CREDIT" || type === "IB_CREDIT") {
      totalYield = totalYield.plus(amount);
    } else if (type === "ADJUSTMENT") {
      if (amount.gte(0)) {
        totalDeposits = totalDeposits.plus(amount);
      } else {
        totalWithdrawals = totalWithdrawals.plus(amount.abs());
      }
    }
  });

  return {
    totalDeposits: totalDeposits.toNumber(),
    totalWithdrawals: totalWithdrawals.toNumber(),
    totalYield: totalYield.toNumber(),
    transactionCount: data?.length || 0,
  };
}

// Plain object singleton for transactionsV2Service.method() pattern
export const transactionsV2Service = {
  getByInvestorId,
  getById,
  voidTransaction,
  getVoidImpact,
  getSummary,
};
