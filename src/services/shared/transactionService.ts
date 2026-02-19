/**
 * Transaction Service - Unified transaction operations
 *
 * CANONICAL SOURCE for transaction creation and user transaction queries
 * Uses types from @/types/domains/transaction
 */

import { supabase } from "@/integrations/supabase/client";
import { getTodayString } from "@/utils/dateUtils";
import type {
  Transaction as BaseTransaction,
  CreateTransactionUIParams,
} from "@/types/domains/transaction";
import { logError } from "@/lib/logger";
import { rpc } from "@/lib/rpc/index";
import { generateUUID } from "@/lib/utils";
import { parseFinancial } from "@/utils/financial";
// Note: CreateTransactionParams should be imported from @/types/domains/transaction
// (exported as CreateTransactionUIParams there)

/**
 * User transaction with investor name for display
 * Used by fetchUserTransactions for investor-facing transaction views
 */
export interface UserTransaction extends Pick<
  BaseTransaction,
  "id" | "investor_id" | "asset" | "amount" | "tx_date" | "created_at" | "notes"
> {
  type: string; // Relaxed to string to handle various transaction types from DB
  txn_type: string | null;
  investor_name?: string;
}

export interface UserTransactionSummary {
  totalCount: number;
  /** @precision NUMERIC - string for financial safety */
  totalDeposits: string;
  /** @precision NUMERIC - string for financial safety */
  totalWithdrawals: string;
  pendingCount: number;
}

/**
 * Fetch transactions for the current user's investor record
 */
export async function fetchUserTransactions(): Promise<UserTransaction[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // user.id IS the investor_id now (One ID)
    const investorId = user.id;

    // Fetch transactions for this investor, using explicit FK hint for profiles join
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
        profile:profiles!fk_transactions_v2_investor(first_name, last_name, email)
      `
      )
      .eq("investor_id", investorId)
      .eq("is_voided", false) // Exclude voided transactions
      .order("tx_date", { ascending: false })
      .order("id", { ascending: false }) // Deterministic tie-breaker for same-day ordering
      .limit(100);

    if (error) throw error;

    interface TransactionRow {
      id: string;
      investor_id: string;
      type: string;
      asset: string;
      amount: string | number;
      tx_date: string;
      created_at: string | null;
      notes: string | null;
      profile?: { first_name: string | null; last_name: string | null; email: string } | null;
    }

    return (data || []).map((tx) => {
      const profile = Array.isArray(tx.profile)
        ? tx.profile[0]
        : (tx.profile as TransactionRow["profile"]);
      const investor_name =
        profile?.first_name || profile?.last_name
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
          : profile?.email || "Unknown";

      return {
        id: tx.id,
        investor_id: tx.investor_id,
        txn_type: tx.type,
        asset: tx.asset,
        amount: String(tx.amount), // Preserve NUMERIC precision as string
        type: tx.type,
        tx_date: tx.tx_date, // V2 schema uses tx_date
        created_at: tx.created_at ?? "",
        notes: tx.notes,
        investor_name: investor_name,
      };
    });
  } catch (error) {
    logError("fetchUserTransactions", error);
    throw error;
  }
}

/**
 * Calculate transaction summary statistics
 */
export async function calculateTransactionSummary(): Promise<UserTransactionSummary> {
  try {
    const transactions = await fetchUserTransactions();

    const summary: UserTransactionSummary = {
      totalCount: transactions.length,
      totalDeposits: "0",
      totalWithdrawals: "0",
      pendingCount: 0,
    };

    transactions.forEach((tx) => {
      const txType = (tx.txn_type || tx.type || "").toUpperCase();

      if (txType === "DEPOSIT") {
        summary.totalDeposits = parseFinancial(summary.totalDeposits)
          .plus(parseFinancial(tx.amount))
          .toString();
      } else if (txType === "WITHDRAWAL") {
        summary.totalWithdrawals = parseFinancial(summary.totalWithdrawals)
          .plus(parseFinancial(tx.amount))
          .toString();
      }
    });

    return summary;
  } catch (error) {
    logError("calculateTransactionSummary", error);
    return {
      totalCount: 0,
      totalDeposits: "0",
      totalWithdrawals: "0",
      pendingCount: 0,
    };
  }
}

// Map FIRST_INVESTMENT to DEPOSIT for database
const mapTypeForDb = (type: string): string => {
  if (type === "FIRST_INVESTMENT") return "DEPOSIT";
  return type;
};

/**
 * Create a transaction (admin use)
 * Accepts CreateTransactionUIParams which allows FIRST_INVESTMENT (mapped to DEPOSIT internally)
 */
export async function createTransactionWithCrystallization(
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
      // closing_aum is now optional — when not provided, pass 0 (no crystallization)
      const closingAumValue = params.closing_aum ? parseFloat(String(params.closing_aum)) : 0;

      // Generate unique trigger reference client-side (idempotency key)
      const triggerReferenceRaw =
        params.reference_id ||
        `manual:${params.fund_id}:${params.investor_id}:${params.tx_date}:${generateUUID()}`;
      const triggerReference = triggerReferenceRaw.replace(/^(DEP:|WDR:)/, "");

      const result = await rpc.call("apply_transaction_with_crystallization", {
        p_fund_id: params.fund_id,
        p_investor_id: params.investor_id,
        p_tx_type: dbType,
        p_amount: String(params.amount) as unknown as number,
        p_tx_date: params.tx_date,
        p_reference_id: triggerReference,
        p_new_total_aum: closingAumValue,
        p_admin_id: user.id,
        p_notes: params.notes || `${dbType} - ${triggerReference}`,
        p_purpose: "transaction",
      });

      if (result.error) {
        logError(`createTransactionWithCrystallization.${dbType}`, result.error, {
          fundId: params.fund_id,
        });
        // Surface the user-friendly error message from gateway
        const errMsg =
          result.error.message || result.error.userMessage || JSON.stringify(result.error);
        throw new Error(errMsg);
      }

      const data = result.data as {
        success?: boolean;
        message?: string;
        error?: string;
        error_code?: string;
      } | null;
      if (!data?.success) {
        const message =
          data?.message ||
          data?.error ||
          (data?.error_code ? `RPC error: ${data.error_code}` : null) ||
          "Failed to create transaction";
        throw new Error(message);
      }

      return { success: true };
    }

    // BLOCKED: transactions_v2 is a PROTECTED table
    // Direct inserts for YIELD, INTEREST, FEE are violations of the canonical mutation pattern.
    //
    // CORRECT PATHWAYS:
    // - YIELD/INTEREST: Use apply_segmented_yield_distribution_v5 RPC
    // - FEE: Use fee allocation RPCs
    //
    // This code path should not be reached. If you need to create these transaction types,
    // use the appropriate canonical RPC or add the type to the allowlist in
    // supabase/migrations/20260117100000_enforce_canonical_mutations.sql

    throw new Error(
      `Transaction type ${dbType} cannot be created through this service. ` +
        `YIELD/INTEREST must use apply_segmented_yield_distribution_v5 RPC. ` +
        `FEE must use fee allocation RPCs. ` +
        `See docs/FLOW_MATRIX.md for canonical mutation pathways.`
    );
  } catch (error) {
    logError("createTransactionWithCrystallization", error);
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
}

export async function createQuickTransaction(params: QuickTransactionParams): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // closingAum is now optional — when not provided, pass 0 (no crystallization)
  const closingAumValue = params.closingAum ? parseFloat(String(params.closingAum)) : 0;

  const today = getTodayString();

  // Generate unique trigger reference to prevent duplicates
  const triggerReference = `manual:${params.fundId}:${params.investorId}:${today}:${generateUUID()}`;

  const result = await rpc.call("apply_transaction_with_crystallization", {
    p_fund_id: params.fundId,
    p_investor_id: params.investorId,
    p_tx_type: params.type,
    p_amount: String(params.amount) as unknown as number,
    p_tx_date: today,
    p_reference_id: triggerReference,
    p_new_total_aum: closingAumValue,
    p_admin_id: user.id,
    p_notes: params.description || `${params.type} - ${triggerReference}`,
    p_purpose: "transaction",
  });

  if (result.error) {
    throw new Error(result.error.userMessage);
  }

  const data = result.data as unknown as { success?: boolean } | null;
  if (!data?.success) {
    throw new Error(`Failed to create ${params.type}`);
  }
}

export const transactionService = {
  fetchUserTransactions,
  calculateTransactionSummary,
  createTransactionWithCrystallization,
  createQuickTransaction,
};
