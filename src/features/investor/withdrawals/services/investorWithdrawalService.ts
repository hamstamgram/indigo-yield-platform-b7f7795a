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

  // Direct insert: create_withdrawal_request RPC was removed.
  const insertPayload: Record<string, unknown> = {
    investor_id: investorId,
    fund_id: fundId,
    amount,
    status: "pending_approval",
    notes,
  };
  const { data, error } = await supabase
    .from("withdrawal_requests")
    .insert(insertPayload as any)
    .select("id")
    .single();

  if (error) throw error;
  return (data as any)?.id as string;
}

/**
 * Cancel a withdrawal request (if still pending)
 * Uses the RPC gateway to ensure state machine validation and audit logging
 */
export async function cancelWithdrawalRequest(requestId: string, reason?: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  // Only allow cancelling own pending withdrawals
  const { error } = await supabase
    .from("withdrawal_requests")
    .update({ status: "cancelled", notes: reason ?? "Cancelled by investor" } as any)
    .eq("id", requestId)
    .eq("investor_id", user.user.id)
    .eq("status", "pending_approval" as any);

  if (error) throw error;
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
