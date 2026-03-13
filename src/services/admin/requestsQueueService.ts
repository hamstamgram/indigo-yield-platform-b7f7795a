/**
 * Requests Queue Service
 * Handles withdrawal request operations for admin
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { parseFinancial } from "@/utils/financial";
import type {
  WithdrawalRequest,
  ApproveWithdrawalParams,
  RejectWithdrawalParams,
} from "@/types/domains/requests";

export const requestsQueueService = {
  /**
   * Fetch all withdrawal requests with profile and fund data
   */
  async fetchWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        *,
        profile:profiles!fk_withdrawal_requests_profile(first_name, last_name, email),
        funds!withdrawal_requests_fund_id_fkey(name, fund_class)
      `
      )
      .order("request_date", { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as WithdrawalRequest[];
  },

  /**
   * Approve and complete a withdrawal request in one atomic operation via RPC
   */
  async approveWithdrawal(params: ApproveWithdrawalParams): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      status: "completed",
      approved_date: new Date().toISOString(),
      completed_date: new Date().toISOString(),
    };
    if (params.amount) {
      updatePayload.amount = Number(parseFinancial(params.amount).toString());
    }
    if (params.notes) {
      updatePayload.notes = params.notes;
    }

    const { error } = await supabase
      .from("withdrawal_requests")
      .update(updatePayload as any)
      .eq("id", params.requestId);

    if (error) throw error;
  },

  /**
   * Reject a withdrawal request
   */
  async rejectWithdrawal(params: RejectWithdrawalParams): Promise<void> {
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "rejected",
        notes: params.notes
          ? `${params.notes} — Reason: ${params.reason}`
          : `Reason: ${params.reason}`,
      } as any)
      .eq("id", params.requestId);

    if (error) throw error;
  },
};
