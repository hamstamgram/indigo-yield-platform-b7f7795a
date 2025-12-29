/**
 * Transaction Form Data Service
 * Handles data fetching for manual transaction form
 */

import { supabase } from "@/integrations/supabase/client";

export interface TransactionFormInvestor {
  id: string;
  name: string;
  email: string;
}

export interface TransactionFormFund {
  id: string;
  name: string;
  code: string;
  asset: string;
}

export interface BalanceCheckResult {
  currentBalance: number;
  hasTransactionHistory: boolean;
}

/**
 * Fetch active investors for transaction form
 */
export async function fetchInvestorsForTransactionForm(): Promise<TransactionFormInvestor[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("status", "active")
    .eq("is_admin", false)
    .order("first_name");

  if (error) throw error;

  return (data || []).map((p) => ({
    id: p.id,
    name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
    email: p.email,
  }));
}

/**
 * Fetch active funds for transaction form
 */
export async function fetchFundsForTransactionForm(): Promise<TransactionFormFund[]> {
  const { data, error } = await supabase
    .from("funds")
    .select("id, name, code, asset")
    .eq("status", "active");

  if (error) throw error;
  return data || [];
}

/**
 * Check if AUM exists for a fund on a specific date
 */
export async function checkAumExists(fundId: string, date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("fund_daily_aum")
    .select("id")
    .eq("fund_id", fundId)
    .eq("aum_date", date)
    .eq("purpose", "transaction")
    .maybeSingle();

  if (error) {
    console.error("Error checking AUM:", error);
    return false;
  }
  
  return !!data;
}

/**
 * Check investor's current balance and transaction history
 */
export async function checkInvestorBalance(
  investorId: string,
  fundId: string
): Promise<BalanceCheckResult> {
  // Check current position balance
  const { data: positionData } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .maybeSingle();

  // Check for any existing transaction history
  const { count: txCount } = await supabase
    .from("transactions_v2")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .eq("type", "DEPOSIT");

  return {
    currentBalance: positionData?.current_value ?? 0,
    hasTransactionHistory: (txCount ?? 0) > 0,
  };
}

export const transactionFormDataService = {
  fetchInvestorsForTransactionForm,
  fetchFundsForTransactionForm,
  checkAumExists,
  checkInvestorBalance,
};
