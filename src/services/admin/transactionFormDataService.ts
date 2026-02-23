/**
 * Transaction Form Data Service
 * Handles data fetching for manual transaction form
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

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
 * Uses centralized investor selector and maps to form-specific shape
 */
export async function fetchInvestorsForTransactionForm(): Promise<TransactionFormInvestor[]> {
  const { fetchInvestorsForSelector } = await import("@/services/investor/investorDataService");
  const items = await fetchInvestorsForSelector(false); // exclude system accounts

  return items.map((p) => ({
    id: p.id,
    name: p.displayName,
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
  // In V6, AUM checkpoints are managed via yield_distributions
  const { data, error } = await supabase
    .from("yield_distributions")
    .select("id")
    .eq("fund_id", fundId)
    .eq("effective_date", date)
    .eq("purpose", "transaction")
    .eq("is_voided", false)
    .maybeSingle();

  if (error) {
    logError("transactionFormDataService.checkAumExists", error);
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
    .eq("type", "DEPOSIT")
    .eq("is_voided", false);

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
