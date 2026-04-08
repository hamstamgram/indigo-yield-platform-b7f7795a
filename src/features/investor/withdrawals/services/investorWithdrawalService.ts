/**
 * Investor Withdrawal Service
 * Handles withdrawal requests for investors
 * Split from investorDataService.ts for better modularity
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import type { FundRelation } from "@/types/domains/relations";

// ============================================
// Types
// ============================================

export interface WithdrawalRequest {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_class: string;
  asset: string;
  requested_amount: string;
  approved_amount?: string;
  processed_amount?: string;
  withdrawal_type: string;
  status: string;
  notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  approved_at?: string | null;
  settlement_date?: string | null;
  tx_hash?: string | null;
}

// ============================================
// Withdrawal Functions
// ============================================

/**
 * Get investor's withdrawal requests
 */
export async function getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const investorId = user.user.id;

  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select(
      `
      *,
      funds!inner(name, asset, fund_class)
    `
    )
    .eq("investor_id", investorId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((request) => {
    const fund = request.funds as unknown as FundRelation | null;
    return {
      id: request.id,
      fund_id: request.fund_id,
      fund_name: fund?.name || "Unknown",
      fund_class: fund?.fund_class || "Standard",
      asset: fund?.asset || "Unknown",
      requested_amount: String(request.requested_amount),
      approved_amount: request.approved_amount ? String(request.approved_amount) : undefined,
      processed_amount: request.processed_amount ? String(request.processed_amount) : undefined,
      withdrawal_type: request.withdrawal_type,
      status: request.status,
      notes: request.notes,
      rejection_reason: request.rejection_reason,
      created_at: request.request_date,
      approved_at: request.approved_at,
      settlement_date: request.settlement_date,
      tx_hash: request.tx_hash,
    };
  });
}

// NOTE: createWithdrawalRequest removed -- canonical implementation is
// investorPortfolioService.createWithdrawalRequest (used by useCreateWithdrawalRequest hook)

/**
 * Cancel a withdrawal request (if still pending)
 * Uses the RPC gateway to ensure state machine validation and audit logging
 */
export async function cancelWithdrawalRequest(requestId: string, reason?: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  // Use canonical RPC to ensure state machine validation and audit logging
  const { data, error } = await rpc.call("cancel_withdrawal_by_investor", {
    p_request_id: requestId,
    p_investor_id: user.user.id,
    p_reason: reason ?? "Cancelled by investor",
  });

  if (error) throw error;

  const result = data as { success: boolean; message?: string; error_code?: string } | null;
  if (result && !result.success) {
    throw new Error(result.message || "Failed to cancel withdrawal");
  }
}

/**
 * Get available funds for investment
 */
export async function getAvailableFunds(): Promise<any[]> {
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .eq("status", "active")
    .order("name");

  if (error) throw error;
  return data || [];
}
