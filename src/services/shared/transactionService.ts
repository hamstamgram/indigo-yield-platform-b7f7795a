/**
 * Transaction Service - Unified transaction operations
 * 
 * CANONICAL SOURCE for transaction creation and user transaction queries
 * Uses types from @/types/domains/transaction
 */

import { supabase } from "@/integrations/supabase/client";
import type { 
  Transaction as BaseTransaction,
  CreateTransactionUIParams,
} from "@/types/domains/transaction";

// Re-export the UI type for backwards compatibility (allows FIRST_INVESTMENT)
export type { CreateTransactionUIParams as CreateTransactionParams } from "@/types/domains/transaction";

// Extended transaction with investor name for display
export interface Transaction extends Pick<BaseTransaction, 'id' | 'investor_id' | 'asset' | 'amount' | 'type' | 'tx_date' | 'created_at' | 'notes'> {
  txn_type: string | null;
  investor_name?: string;
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
      .eq("is_voided", false) // Exclude voided transactions
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

// Default tx_subtype based on transaction type
const getDefaultTxSubtype = (type: string): string => {
  switch (type) {
    case "FIRST_INVESTMENT": return "first_investment";
    case "DEPOSIT": return "deposit";
    case "WITHDRAWAL": return "redemption";
    case "FEE": return "fee_charge";
    case "INTEREST":
    case "YIELD": return "yield_credit";
    default: return "adjustment";
  }
};

// Map FIRST_INVESTMENT to DEPOSIT for database (the distinction is in tx_subtype)
const mapTypeForDb = (type: string): string => {
  if (type === "FIRST_INVESTMENT") return "DEPOSIT";
  return type;
};

/**
 * Create a transaction (admin use)
 * Accepts CreateTransactionUIParams which allows FIRST_INVESTMENT (mapped to DEPOSIT internally)
 */
export async function createAdminTransaction(
  params: CreateTransactionUIParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be logged in to create transactions" };
    }

    // Map FIRST_INVESTMENT to DEPOSIT for DB enum compliance
    const dbType = mapTypeForDb(params.type);
    
    // For DEPOSIT/WITHDRAWAL, use crystallize-before-flow RPCs (no manual position writes).
    if (dbType === "DEPOSIT" || dbType === "WITHDRAWAL") {
      const note = params.notes || `${dbType} of ${params.amount} ${params.asset}`;
      void note;

      const closingAum = params.closing_aum;
      if (!closingAum) {
        throw new Error(
          "closing_aum is required for DEPOSIT/WITHDRAWAL (crystallize-before-flow). Provide the authoritative AUM snapshot for this event."
        );
      }

      // Generate unique trigger reference client-side (idempotency key)
      const triggerReferenceRaw =
        params.reference_id || `manual:${params.fund_id}:${params.investor_id}:${params.tx_date}:${crypto.randomUUID()}`;
      const triggerReference = triggerReferenceRaw.replace(/^(DEP:|WDR:)/, "");

      const rpcCall = (supabase.rpc as any).bind(supabase);
      const { data, error } =
        dbType === "DEPOSIT"
          ? await rpcCall("apply_deposit_with_crystallization", {
              p_fund_id: params.fund_id,
              p_investor_id: params.investor_id,
              p_amount: params.amount,
              p_closing_aum: closingAum,
              p_effective_date: params.tx_date,
              p_admin_id: user.id,
              p_notes: params.notes || `${dbType} - ${triggerReference}`,
              p_purpose: "transaction",
            })
          : await rpcCall("apply_withdrawal_with_crystallization", {
              p_fund_id: params.fund_id,
              p_investor_id: params.investor_id,
              p_amount: params.amount,
              p_closing_aum: closingAum,
              p_effective_date: params.tx_date,
              p_admin_id: user.id,
              p_notes: params.notes || `${dbType} - ${triggerReference}`,
              p_purpose: "transaction",
            });
      
      if (error) {
        console.error(`${dbType} crystallize-before-flow error:`, error);
        // Surface the actual Postgres error message
        const errorMessage = error.message || error.details || "Failed to create transaction";
        throw new Error(errorMessage);
      }

      if (!data?.success) {
        throw new Error("Failed to create transaction");
      }

      return { success: true };
    }
    
    // For other transaction types (YIELD, INTEREST, FEE), use direct insert
    const txSubtype = params.tx_subtype || getDefaultTxSubtype(params.type);

    const { error } = await supabase.from("transactions_v2").insert({
      investor_id: params.investor_id,
      fund_id: params.fund_id,
      type: dbType as any,
      tx_subtype: txSubtype,
      asset: params.asset,
      amount: params.amount,
      tx_date: params.tx_date,
      value_date: params.tx_date,
      reference_id: params.reference_id || null,
      tx_hash: params.tx_hash || null,
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

/**
 * Quick transaction creation (simplified params for common use cases)
 * Accepts camelCase params for convenience
 */
export interface QuickTransactionParams {
  investorId: string;
  fundId: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  description?: string;
  closingAum?: string;
  eventTs?: string;
  txHash?: string;
}

export async function createQuickTransaction(params: QuickTransactionParams): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const note = params.description || `${params.type} transaction`;
  
  const closingAum = params.closingAum;
  if (!closingAum) {
    throw new Error(
      "closingAum is required for DEPOSIT/WITHDRAWAL (crystallize-before-flow). Provide the authoritative AUM snapshot for this event."
    );
  }

  const today = new Date().toISOString().split("T")[0];

  // Generate unique trigger reference to prevent duplicates
  const triggerReference = `manual:${params.fundId}:${params.investorId}:${today}:${crypto.randomUUID()}`;

  const rpcCall = (supabase.rpc as any).bind(supabase);
  const { data, error } =
    params.type === "DEPOSIT"
      ? await rpcCall("apply_deposit_with_crystallization", {
          p_fund_id: params.fundId,
          p_investor_id: params.investorId,
          p_amount: params.amount,
          p_closing_aum: closingAum,
          p_effective_date: today,
          p_admin_id: user.id,
          p_notes: params.description || `${params.type} - ${triggerReference}`,
          p_purpose: "transaction",
        })
      : await rpcCall("apply_withdrawal_with_crystallization", {
          p_fund_id: params.fundId,
          p_investor_id: params.investorId,
          p_amount: params.amount,
          p_closing_aum: closingAum,
          p_effective_date: today,
          p_admin_id: user.id,
          p_notes: params.description || `${params.type} - ${triggerReference}`,
          p_purpose: "transaction",
        });

  if (error) {
    const errorMessage = error.message || error.details || "Failed to create transaction";
    throw new Error(errorMessage);
  }

  if (!data?.success) {
    throw new Error(`Failed to create ${params.type}`);
  }

  void note;
}

export const transactionService = {
  fetchUserTransactions,
  calculateTransactionSummary,
  createAdminTransaction,
  createQuickTransaction,
};
