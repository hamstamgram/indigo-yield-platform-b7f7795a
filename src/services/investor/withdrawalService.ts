import { supabase } from "@/integrations/supabase/client";
import { Withdrawal, WithdrawalFilters, WithdrawalStats } from "@/types/withdrawal";

export const withdrawalService = {
  /**
   * Get all withdrawal requests with optional filters
   */
  async getWithdrawals(filters?: WithdrawalFilters): Promise<Withdrawal[]> {
    // Use JOIN to fetch investor data in single query (fixes N+1)
    let query = supabase
      .from("withdrawal_requests")
      .select("*, profile:profiles!fk_withdrawal_requests_profile(first_name, last_name, email)") // Join profiles
      .order("request_date", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.fund_id) {
      query = query.eq("fund_id", filters.fund_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map the joined data to flat structure
    const withdrawalsWithProfiles = (data || []).map((withdrawal) => {
      const profile = withdrawal.profile as {
        first_name?: string;
        last_name?: string;
        email?: string;
      } | null;
      const investor_name = profile?.first_name || profile?.last_name
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : profile?.email || "Unknown";
      
      return {
        ...withdrawal,
        investor_name: investor_name,
        investor_email: profile?.email || "",
        profile: undefined, // Remove nested object
      };
    });

    // Apply search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      return withdrawalsWithProfiles.filter(
        (w) =>
          w.investor_name?.toLowerCase().includes(searchLower) ||
          w.investor_email?.toLowerCase().includes(searchLower) ||
          w.id.toLowerCase().includes(searchLower)
      );
    }

    return withdrawalsWithProfiles;
  },

  /**
   * Get withdrawal statistics with per-asset pending breakdown
   */
  async getStats(): Promise<WithdrawalStats> {
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select("status, requested_amount, fund:funds(asset)");

    if (error) throw error;

    const stats: WithdrawalStats = {
      pending: 0,
      approved: 0,
      processing: 0,
      completed: 0,
      rejected: 0,
      pending_by_asset: [],
    };

    const assetAmounts: Record<string, number> = {};

    data?.forEach((withdrawal) => {
      const status = withdrawal.status as string;
      if (status in stats && typeof stats[status as keyof WithdrawalStats] === "number") {
        (stats as any)[status]++;
      }
      // Group pending amounts by asset
      if (withdrawal.status === "pending" || withdrawal.status === "approved") {
        const asset = (withdrawal.fund as { asset?: string } | null)?.asset || "Unknown";
        assetAmounts[asset] = (assetAmounts[asset] || 0) + (withdrawal.requested_amount || 0);
      }
    });

    // Convert to array sorted by asset name
    stats.pending_by_asset = Object.entries(assetAmounts)
      .map(([asset, amount]) => ({ asset, amount }))
      .sort((a, b) => a.asset.localeCompare(b.asset));

    return stats;
  },

  /**
   * Approve a withdrawal request using secure RPC with server-side admin check
   */
  async approveWithdrawal(
    withdrawalId: string,
    processedAmount: number,
    adminNotes?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('approve_withdrawal', {
      p_request_id: withdrawalId,
      p_approved_amount: processedAmount,
      p_notes: adminNotes || null
    });

    if (error) {
      console.error("Error approving withdrawal:", error);
      throw new Error(error.message || "Failed to approve withdrawal");
    }
  },

  /**
   * Reject a withdrawal request using secure RPC with server-side admin check
   */
  async rejectWithdrawal(withdrawalId: string, reason: string, adminNotes?: string): Promise<void> {
    const { error } = await supabase.rpc('reject_withdrawal', {
      p_request_id: withdrawalId,
      p_reason: reason,
      p_notes: adminNotes || null
    });

    if (error) {
      console.error("Error rejecting withdrawal:", error);
      throw new Error(error.message || "Failed to reject withdrawal");
    }
  },

  /**
   * Mark withdrawal as processing using secure RPC with server-side admin check
   */
  async markAsProcessing(
    withdrawalId: string,
    txHash?: string,
    adminNotes?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('start_processing_withdrawal', {
      p_request_id: withdrawalId,
      p_processed_amount: null,
      p_notes: adminNotes || null,
      p_expected_completion: null,
      p_tx_hash: txHash || null
    });

    if (error) {
      console.error("Error marking withdrawal as processing:", error);
      throw new Error(error.message || "Failed to start processing withdrawal");
    }
  },

  /**
   * Mark withdrawal as completed using secure RPC with server-side admin check
   */
  async markAsCompleted(withdrawalId: string, txHash?: string, adminNotes?: string): Promise<void> {
    const { error } = await supabase.rpc('complete_withdrawal', {
      p_request_id: withdrawalId,
      p_tx_hash: txHash || null,
      p_notes: adminNotes || null
    });

    if (error) {
      console.error("Error completing withdrawal:", error);
      throw new Error(error.message || "Failed to complete withdrawal");
    }
  },

  /**
   * Cancel a withdrawal request using secure RPC with server-side admin check
   */
  async cancelWithdrawal(withdrawalId: string, reason: string, adminNotes?: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_withdrawal_by_admin', {
      p_request_id: withdrawalId,
      p_reason: reason,
      p_notes: adminNotes || null
    });

    if (error) {
      console.error("Error cancelling withdrawal:", error);
      throw new Error(error.message || "Failed to cancel withdrawal");
    }
  },
};
