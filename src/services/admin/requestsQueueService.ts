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
   * Reject a withdrawal request
   */
  async rejectWithdrawal(params: RejectWithdrawalParams): Promise<void> {
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "rejected",
        rejection_reason: params.reason,
        admin_notes: params.notes,
        rejected_at: new Date().toISOString(),
      } as any)
      .eq("id", params.requestId);

    if (error) throw error;
  },
};
