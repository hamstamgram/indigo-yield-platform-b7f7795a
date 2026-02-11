/**
 * Investor Yield History Service
 * Handles yield history and document management
 * Split from investorDataService.ts for better modularity
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { formatDateForDB } from "@/utils/dateUtils";
import type { FundRelation } from "@/types/domains/relations";

// ============================================
// Types
// ============================================

export interface YieldHistoryEntry {
  date: string;
  asset: string;
  balance_before: string;
  yield_amount: string;
  balance_after: string;
  daily_rate: number;
  annual_rate: number;
}

export interface InvestorDocument {
  id: string;
  title: string;
  type: string;
  storage_path: string;
  period_start?: string | null;
  period_end?: string | null;
  created_at: string;
}

export interface PendingTransaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: string;
  asset: string;
  created_at: string;
  status: string;
  note: string;
}

// ============================================
// Yield History Functions
// ============================================

/**
 * Get yield history for the investor (from transactions_v2)
 */
export async function getYieldHistory(days: number = 30): Promise<YieldHistoryEntry[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const investorId = user.user.id;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get yield transactions (INTEREST type) from transactions_v2
  const { data, error } = await supabase
    .from("transactions_v2")
    .select("*")
    .eq("investor_id", investorId)
    .in("type", ["YIELD", "FEE_CREDIT", "IB_CREDIT"])
    .eq("is_voided", false)
    .gte("tx_date", formatDateForDB(startDate))
    .order("tx_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;

  return (data || []).map((entry) => ({
    date: entry.tx_date,
    asset: entry.asset,
    balance_before: String(entry.balance_before || "0"),
    yield_amount: String(entry.amount || "0"),
    balance_after: String(entry.balance_after || "0"),
    daily_rate: 0,
    annual_rate: 0,
  }));
}

// ============================================
// Document Functions
// ============================================

/**
 * Get investor's documents (class method version - for InvestorDataService)
 */
export async function getInvestorDocumentsForUser(): Promise<any[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get investor's documents by userId
 */
export async function getInvestorDocuments(userId: string): Promise<InvestorDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    logError("investorYieldHistory.getDocuments", error, { userId });
    throw error;
  }

  return (data || []).map((doc) => ({
    id: doc.id,
    title: doc.title,
    type: doc.type,
    storage_path: doc.storage_path,
    period_start: doc.period_start,
    period_end: doc.period_end,
    created_at: doc.created_at,
  }));
}

/**
 * Download a document from storage
 */
export async function downloadDocument(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from("documents").download(storagePath);

  if (error) {
    logError("investorYieldHistory.downloadDocument", error, { storagePath });
    throw error;
  }

  return data;
}

/**
 * Get pending transactions (deposits + withdrawals)
 */
export async function getPendingTransactions(
  userId: string,
  searchTerm?: string
): Promise<PendingTransaction[]> {
  // Get Pending Withdrawals (deposits now go through transactions_v2)
  const { data: withdrawals, error: withdrawalError } = await supabase
    .from("withdrawal_requests")
    .select(`*, funds ( name, code, asset )`)
    .eq("investor_id", userId)
    .eq("status", "pending");

  if (withdrawalError) throw withdrawalError;

  const normalizedWithdrawals: PendingTransaction[] = (withdrawals || []).map((w) => {
    const fund = (w as { funds?: unknown }).funds as FundRelation | undefined;
    return {
      id: w.id,
      type: "WITHDRAWAL" as const,
      amount: w.requested_amount,
      asset: fund?.asset || "Unknown",
      created_at: w.request_date || "",
      status: w.status || "pending",
      note: `Withdrawal from ${fund?.name || "Fund"}`,
    };
  });

  let allItems = [...normalizedWithdrawals];

  // Filter if search term provided
  if (searchTerm) {
    const lowerSearch = searchTerm.toLowerCase();
    allItems = allItems.filter(
      (item) =>
        item.asset.toLowerCase().includes(lowerSearch) ||
        item.note.toLowerCase().includes(lowerSearch) ||
        item.type.toLowerCase().includes(lowerSearch)
    );
  }

  // Sort by created_at descending
  return allItems.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
