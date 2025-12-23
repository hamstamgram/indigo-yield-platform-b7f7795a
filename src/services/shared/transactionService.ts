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
  investor_id: string;
  fund_id: string;
  type: "FIRST_INVESTMENT" | "DEPOSIT" | "WITHDRAWAL" | "YIELD" | "INTEREST" | "FEE";
  asset: string;
  amount: number;
  tx_date: string;
  reference_id?: string;
  tx_hash?: string;
  notes?: string;
  tx_subtype?: "first_investment" | "deposit" | "redemption" | "full_redemption" | "fee_charge" | "yield_credit" | "adjustment";
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

    // Map FIRST_INVESTMENT to DEPOSIT for DB enum compliance
    const dbType = mapTypeForDb(params.type);
    
    // For DEPOSIT/WITHDRAWAL, validate position state and use the adjust_investor_position RPC
    // This properly updates both transactions_v2 AND investor_positions
    if (dbType === "DEPOSIT" || dbType === "WITHDRAWAL") {
      // Check current position to validate transaction type
      const { data: position } = await supabase
        .from("investor_positions")
        .select("current_value")
        .eq("investor_id", params.investor_id)
        .eq("fund_id", params.fund_id)
        .maybeSingle();
      
      const hasPosition = position && position.current_value > 0;
      
      // Validate: FIRST_INVESTMENT requires no position, DEPOSIT requires existing position
      if (params.type === "FIRST_INVESTMENT" && hasPosition) {
        console.warn("[createAdminTransaction] FIRST_INVESTMENT used with existing position, converting to DEPOSIT");
      }
      if (params.type === "DEPOSIT" && !hasPosition) {
        // Block TOP_UP when balance is zero - require FIRST_INVESTMENT
        console.error("[createAdminTransaction] DEPOSIT blocked - investor has no position in this fund");
        return { 
          success: false, 
          error: "Cannot create Deposit for investor with no existing position. Use 'First Investment' instead." 
        };
      }
      
      const delta = dbType === "DEPOSIT" ? params.amount : -params.amount;
      const note = params.notes || `${dbType} of ${params.amount} ${params.asset}`;
      
      const rpcCall = (supabase.rpc as any).bind(supabase);
      const { error } = await rpcCall("adjust_investor_position", {
        p_investor_id: params.investor_id,
        p_fund_id: params.fund_id,
        p_delta: delta,
        p_note: note,
        p_admin_id: user.id,
      });
      
      if (error) {
        console.error("adjust_investor_position error:", error);
        throw error;
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

export const transactionService = {
  fetchUserTransactions,
  calculateTransactionSummary,
  createAdminTransaction,
};
