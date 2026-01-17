/**
 * Admin Transaction History Service
 * Handles fetching and managing transaction history for admin views
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";
import type {
  AdminTransactionFilters,
  AdminTransactionResult,
  TransactionViewModel,
  TransactionType,
  FundOption,
  UpdateTransactionParams,
  VoidTransactionParams,
  VoidAndReissueParams,
  VoidAndReissueResult,
} from "@/types/domains/transaction";

const PAGE_SIZE = 50;

/** Transaction row from query with profile join */
interface TransactionRow {
  id: string;
  investor_id: string;
  fund_id: string | null;
  type: string;
  tx_subtype?: string | null;
  asset: string;
  amount: number | string;
  tx_date: string;
  notes: string | null;
  tx_hash: string | null;
  created_at: string;
  created_by: string | null;
  visibility_scope: string | null;
  is_voided: boolean | null;
  is_system_generated: boolean | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

/** Extended error with code and details */
interface ExtendedError extends Error {
  code?: string;
  details?: unknown;
}

/** RPC result structure */
interface VoidReissueRPCResult {
  success?: boolean;
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
  data?: {
    voided_transaction_id?: string;
    new_transaction_id?: string;
  };
  voided_transaction_id?: string;
  new_transaction_id?: string;
  message?: string;
}

// Display type mapping from tx_subtype to user-friendly labels
const SUBTYPE_DISPLAY_MAP: Record<string, string> = {
  first_investment: "First Investment",
  deposit: "Top-up",
  redemption: "Withdrawal",
  full_redemption: "Withdrawal All",
  fee_charge: "Fee",
  yield_credit: "Interest/Yield",
  adjustment: "Adjustment",
};

/**
 * Fetch active funds for filter dropdowns
 */
async function fetchActiveFunds(): Promise<FundOption[]> {
  const { data, error } = await supabase
    .from("funds")
    .select("id, code, name, asset")
    .eq("status", "active")
    .order("code");

  if (error) throw error;
  return data || [];
}

/**
 * Fetch paginated transactions with filters
 */
async function fetchTransactions(
  filters: AdminTransactionFilters,
  funds: FundOption[]
): Promise<AdminTransactionResult> {
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? PAGE_SIZE;

  let query = supabase
    .from("transactions_v2")
    .select(
      `
      id, investor_id, fund_id, type, tx_subtype, asset, amount, tx_date, notes, tx_hash, created_at, created_by, visibility_scope, is_voided, is_system_generated,
      profiles!transactions_v2_investor_id_fkey (email, first_name, last_name)
    `,
      { count: "exact" }
    )
    .order("tx_date", { ascending: false })
    .order("id", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  // Filter out voided unless specifically requested
  if (!filters.showVoided) {
    query = query.eq("is_voided", false);
  }

  if (filters.fundId && filters.fundId !== "all") {
    query = query.eq("fund_id", filters.fundId);
  }
  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.dateFrom) {
    query = query.gte("tx_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("tx_date", filters.dateTo);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const transactions = ((data || []) as TransactionRow[]).map((tx): TransactionViewModel => {
    const profile = tx.profiles;
    const fund = funds.find((f) => f.id === tx.fund_id);

    // Use explicit tx_subtype for display - NO HEURISTICS!
    let displayType = tx.type;
    if (tx.tx_subtype && SUBTYPE_DISPLAY_MAP[tx.tx_subtype]) {
      displayType = SUBTYPE_DISPLAY_MAP[tx.tx_subtype];
    } else {
      // Fallback for any data without tx_subtype (legacy safety)
      if (tx.type === "DEPOSIT") displayType = "Top-up";
      else if (tx.type === "WITHDRAWAL") displayType = "Withdrawal";
      else if (tx.type === "INTEREST") displayType = "Interest/Yield";
      else if (tx.type === "FEE") displayType = "Fee";
    }

    return {
      id: tx.id,
      investorId: tx.investor_id,
      investorName: profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
        : "Unknown",
      investorEmail: profile?.email || "",
      fundId: tx.fund_id,
      fundName: fund?.name || tx.asset,
      asset: tx.asset,
      type: tx.type as TransactionType,
      displayType,
      amount: String(tx.amount),
      txDate: tx.tx_date,
      notes: tx.notes,
      txHash: tx.tx_hash,
      createdAt: tx.created_at,
      createdBy: tx.created_by,
      visibilityScope: tx.visibility_scope || "investor_visible",
      isVoided: tx.is_voided || false,
      isSystemGenerated: tx.is_system_generated || false,
    };
  });

  return { transactions, totalCount: count || 0 };
}

/**
 * Update a transaction via RPC
 */
async function updateTransaction(params: UpdateTransactionParams): Promise<void> {
  const { error } = await rpc.call("update_transaction", {
    p_transaction_id: params.transactionId,
    p_updates: params.updates,
    p_reason: params.reason,
  });

  if (error) throw new Error(error.userMessage || error.message);
}

/**
 * Void a transaction via RPC
 * Canonical signature: void_transaction(p_transaction_id uuid, p_void_reason text, p_admin_id uuid)
 */
async function voidTransaction(params: VoidTransactionParams): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user?.id) throw new Error("Authentication required");

  // Canonical DB signature: void_transaction(p_transaction_id, p_void_reason, p_admin_id)
  const { data, error } = await rpc.call("void_transaction", {
    p_transaction_id: params.transactionId,
    p_reason: params.reason,
    p_admin_id: user.id,
  });

  if (error) {
    throw new Error(error.userMessage || "Failed to void transaction");
  }

  // Check RPC result for success
  const result = data as { success?: boolean; message?: string; error_code?: string } | null;
  if (result && result.success === false) {
    throw new Error(result.message || result.error_code || "Failed to void transaction");
  }
}

/**
 * Void and reissue a transaction atomically via RPC
 * This is the preferred method for correcting transactions while maintaining ledger immutability.
 */
async function voidAndReissueTransaction(
  params: VoidAndReissueParams
): Promise<VoidAndReissueResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user?.id) throw new Error("Authentication required");

  const notesParts = [params.newValues.notes || ""].filter(Boolean);
  if (params.newValues.tx_hash) {
    notesParts.push(`Tx hash: ${params.newValues.tx_hash}`);
  }
  const mergedNotes = notesParts.join("\n").trim() || null;

  const { data, error } = await rpc.call("void_and_reissue_transaction", {
    p_original_tx_id: params.transactionId,
    p_new_amount: params.newValues.amount,
    p_new_date: params.newValues.tx_date,
    p_new_notes: mergedNotes,
    p_closing_aum: params.closingAum,
    p_admin_id: user.id,
    p_reason: params.reason,
  });

  if (error) {
    // Fallback for legacy signatures (until migrations are applied)
    const legacy = await rpc.call("void_and_reissue_transaction" as any, {
      p_original_transaction_id: params.transactionId,
      p_new_amount: params.newValues.amount,
      p_new_tx_date: params.newValues.tx_date,
      p_new_notes: mergedNotes,
      p_reason: params.reason,
    });
    if (legacy.error) throw new Error(error.userMessage || error.message);
    return {
      success: true,
      voided_transaction_id: params.transactionId,
      new_transaction_id: "",
      message: "Transaction corrected successfully",
    };
  }

  // Handle typed response from RPC
  if (data && typeof data === "object") {
    const result = data as Record<string, unknown>;
    if (result.success === false && result.error) {
      // Typed error from RPC
      const errorObj = result.error as Record<string, unknown>;
      const err = new Error(errorObj.message as string) as ExtendedError;
      err.code = errorObj.code as string | undefined;
      err.details = errorObj.details;
      throw err;
    }
    const rpcResult = result as VoidReissueRPCResult;
    return {
      success: true,
      voided_transaction_id:
        rpcResult.data?.voided_transaction_id ||
        rpcResult.voided_transaction_id ||
        params.transactionId,
      new_transaction_id: rpcResult.data?.new_transaction_id || rpcResult.new_transaction_id || "",
      message: rpcResult.message,
    };
  }

  return {
    success: true,
    voided_transaction_id: params.transactionId,
    new_transaction_id: "",
    message: "Transaction corrected successfully",
  };
}

export const adminTransactionHistoryService = {
  fetchActiveFunds,
  fetchTransactions,
  updateTransaction,
  voidTransaction,
  voidAndReissueTransaction,
};
