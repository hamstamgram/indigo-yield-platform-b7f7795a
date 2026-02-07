/**
 * Transaction Details Service
 * Handles fetching individual transaction details and related data
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

// ==================== Types ====================

export interface TransactionDetail {
  id: string;
  investor_id: string;
  fund_id: string;
  type: string;
  amount: number;
  asset: string;
  tx_date: string;
  tx_hash: string | null;
  notes: string | null;
  purpose: string | null;
  visibility_scope: string | null;
  created_at: string;
  is_voided: boolean;
}

export interface TransactionWithRelated extends TransactionDetail {
  investor?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  fund?: {
    id: string;
    name: string;
    code: string;
    asset: string;
  } | null;
}

export interface InvestorForTransaction {
  id: string;
  name: string;
  email: string;
}

export interface FundForTransaction {
  id: string;
  name: string;
  code: string;
  asset: string;
}

export interface BalanceCheckResult {
  currentBalance: number;
  hasTransactionHistory: boolean;
}

export interface AumCheckResult {
  exists: boolean;
}

// ==================== Service Functions ====================

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(id: string): Promise<TransactionDetail | null> {
  const { data, error } = await supabase
    .from("transactions_v2")
    .select(
      "id, investor_id, fund_id, type, amount, asset, tx_date, tx_hash, notes, purpose, visibility_scope, created_at, is_voided"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get a transaction with related investor and fund data
 */
export async function getTransactionWithRelated(
  id: string
): Promise<TransactionWithRelated | null> {
  const transaction = await getTransactionById(id);
  if (!transaction) return null;

  // Fetch related data in parallel
  const [investorResult, fundResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("id", transaction.investor_id)
      .maybeSingle(),
    supabase
      .from("funds")
      .select("id, name, code, asset")
      .eq("id", transaction.fund_id)
      .maybeSingle(),
  ]);

  return {
    ...transaction,
    investor: investorResult.data,
    fund: fundResult.data,
  };
}

/**
 * Fetch investors for transaction form dropdown (non-admin active profiles)
 */
export async function getInvestorsForTransaction(): Promise<InvestorForTransaction[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("status", "active")
    .eq("is_admin", false)
    .order("first_name")
    .limit(500);

  if (error) throw error;

  return (data || []).map((p) => ({
    id: p.id,
    name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
    email: p.email,
  }));
}

/**
 * Fetch funds for transaction form dropdown
 */
export async function getFundsForTransaction(): Promise<FundForTransaction[]> {
  const { data, error } = await supabase
    .from("funds")
    .select("id, name, code, asset")
    .eq("status", "active")
    .limit(100);

  if (error) throw error;
  return data || [];
}

/**
 * Check investor balance and transaction history for a specific fund
 */
export async function checkInvestorBalance(
  investorId: string,
  fundId: string
): Promise<BalanceCheckResult> {
  const [positionResult, txCountResult] = await Promise.all([
    supabase
      .from("investor_positions")
      .select("current_value")
      .eq("investor_id", investorId)
      .eq("fund_id", fundId)
      .maybeSingle(),
    supabase
      .from("transactions_v2")
      .select("id", { count: "exact", head: true })
      .eq("investor_id", investorId)
      .eq("fund_id", fundId)
      .eq("type", "DEPOSIT")
      .eq("is_voided", false),
  ]);

  return {
    currentBalance: positionResult.data?.current_value ?? 0,
    hasTransactionHistory: (txCountResult.count ?? 0) > 0,
  };
}

/**
 * Check if AUM exists for a fund on a specific date
 */
export async function checkAumExists(fundId: string, date: string): Promise<AumCheckResult> {
  const { data, error } = await supabase
    .from("fund_daily_aum")
    .select("id")
    .eq("fund_id", fundId)
    .eq("aum_date", date)
    .eq("purpose", "transaction")
    .maybeSingle();

  if (error) {
    logError("checkAumExists", error, { fundId, date });
    return { exists: false };
  }

  return { exists: !!data };
}

/**
 * Fetch all data needed for transaction form
 */
export async function getTransactionFormData(): Promise<{
  investors: InvestorForTransaction[];
  funds: FundForTransaction[];
}> {
  const [investors, funds] = await Promise.all([
    getInvestorsForTransaction(),
    getFundsForTransaction(),
  ]);

  return { investors, funds };
}
