/**
 * Investor Withdrawal Service
 * Handles withdrawal requests for investors
 * Split from investorDataService.ts for better modularity
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";

// ============================================
// Types
// ============================================

export interface WithdrawalRequest {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_class: string;
  asset: string;
  requested_amount: number;
  approved_amount?: number;
  processed_amount?: number;
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

  return (data || []).map((request) => ({
    id: request.id,
    fund_id: request.fund_id,
    fund_name: (request.funds as any)?.name || "Unknown",
    fund_class: (request.funds as any)?.fund_class || "Standard",
    asset: (request.funds as any)?.asset || "Unknown",
    requested_amount: Number(request.requested_amount),
    approved_amount: request.approved_amount ? Number(request.approved_amount) : undefined,
    processed_amount: request.processed_amount ? Number(request.processed_amount) : undefined,
    withdrawal_type: request.withdrawal_type,
    status: request.status,
    notes: request.notes,
    rejection_reason: request.rejection_reason,
    created_at: request.request_date,
    approved_at: request.approved_at,
    settlement_date: request.settlement_date,
    tx_hash: request.tx_hash,
  }));
}

/**
 * Create a withdrawal request
 */
export async function createWithdrawalRequest(
  fundId: string,
  amount: number,
  withdrawalType: string = "partial",
  notes?: string
): Promise<string> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  const investorId = user.user.id;

  const { data, error } = await rpc.call("create_withdrawal_request", {
    p_investor_id: investorId,
    p_fund_id: fundId,
    p_amount: amount,
    p_type: withdrawalType,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data;
}

/**
 * Cancel a withdrawal request (if still pending)
 * Uses the RPC gateway to ensure state machine validation and audit logging
 */
export async function cancelWithdrawalRequest(requestId: string, reason?: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  // Use RPC to ensure state machine validation and audit trail
  const { data, error } = await rpc.call("cancel_withdrawal_by_investor", {
    p_request_id: requestId,
    p_investor_id: user.user.id,
    p_reason: reason ?? "Cancelled by investor",
  });

  if (error) throw error;
  
  // Check for RPC-level errors
  const result = data as { success?: boolean; message?: string; error_code?: string } | null;
  if (result && result.success === false) {
    throw new Error(result.message || result.error_code || "Failed to cancel withdrawal");
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
