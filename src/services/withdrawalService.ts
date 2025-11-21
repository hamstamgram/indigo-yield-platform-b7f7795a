import { supabase } from "@/integrations/supabase/client";
import { Withdrawal, WithdrawalFilters, WithdrawalStats } from "@/types/withdrawal";

export const withdrawalService = {
  /**
   * Get all withdrawal requests with optional filters
   */
  async getWithdrawals(filters?: WithdrawalFilters): Promise<Withdrawal[]> {
    let query = supabase
      .from("withdrawal_requests")
      .select("*")
      .order("request_date", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.fund_id) {
      query = query.eq("fund_id", filters.fund_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch investor details for each withdrawal
    const withdrawalsWithInvestors = await Promise.all(
      (data || []).map(async (withdrawal) => {
        const { data: investorData } = await supabase
          .from("investors")
          .select("name, email, profile_id")
          .eq("id", withdrawal.investor_id)
          .single();

        return {
          ...withdrawal,
          investor_name: investorData?.name || "Unknown",
          investor_email: investorData?.email || "",
        };
      })
    );

    // Apply search filter after fetching investor data
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      return withdrawalsWithInvestors.filter(
        (w) =>
          w.investor_name?.toLowerCase().includes(searchLower) ||
          w.investor_email?.toLowerCase().includes(searchLower) ||
          w.id.toLowerCase().includes(searchLower)
      );
    }

    return withdrawalsWithInvestors;
  },

  /**
   * Get withdrawal statistics
   */
  async getStats(): Promise<WithdrawalStats> {
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select("status, requested_amount");

    if (error) throw error;

    const stats: WithdrawalStats = {
      pending: 0,
      approved: 0,
      processing: 0,
      completed: 0,
      rejected: 0,
      total_pending_amount: 0,
    };

    data?.forEach((withdrawal) => {
      const status = withdrawal.status as keyof WithdrawalStats;
      if (typeof stats[status] === "number") {
        stats[status]++;
      }
      if (withdrawal.status === "pending" || withdrawal.status === "approved") {
        stats.total_pending_amount += withdrawal.requested_amount || 0;
      }
    });

    return stats;
  },

  /**
   * Approve a withdrawal request
   */
  async approveWithdrawal(
    withdrawalId: string,
    processedAmount: number,
    adminNotes?: string
  ): Promise<void> {
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "approved",
        processed_amount: processedAmount,
        admin_notes: adminNotes,
        approved_by: (await supabase.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (error) throw error;
  },

  /**
   * Reject a withdrawal request
   */
  async rejectWithdrawal(withdrawalId: string, reason: string, adminNotes?: string): Promise<void> {
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "rejected",
        rejection_reason: reason,
        admin_notes: adminNotes,
        rejected_by: (await supabase.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (error) throw error;
  },

  /**
   * Mark withdrawal as processing
   */
  async markAsProcessing(
    withdrawalId: string,
    txHash?: string,
    adminNotes?: string
  ): Promise<void> {
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "processing",
        tx_hash: txHash,
        admin_notes: adminNotes,
        processed_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (error) throw error;
  },

  /**
   * Mark withdrawal as completed
   */
  async markAsCompleted(withdrawalId: string, txHash?: string, adminNotes?: string): Promise<void> {
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "completed",
        tx_hash: txHash,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (error) throw error;
  },
};
