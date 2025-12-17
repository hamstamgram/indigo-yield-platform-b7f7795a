import { supabase } from "@/integrations/supabase/client";
import { Withdrawal, WithdrawalFilters, WithdrawalStats } from "@/types/withdrawal";
import { v4 as uuidv4 } from "uuid";

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
    // Fetch request details
    const { data: request, error: fetchError } = await supabase
      .from("withdrawal_requests")
      .select("*, funds(asset, fund_class)") // fund asset needed for transactions_v2
      .eq("id", withdrawalId)
      .single();
    if (fetchError) throw fetchError;

    const adminId = (await supabase.auth.getUser()).data.user?.id;

    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "approved",
        processed_amount: processedAmount,
        admin_notes: adminNotes,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (error) throw error;

    // Record transaction_v2 (provisional) for audit trail
    // request.investor_id is now profile.id
    if (request?.investor_id && request?.fund_id) {
      const req = request as any;
      await supabase.from("transactions_v2").insert({
        id: uuidv4(),
        investor_id: req.investor_id, // This is profile.id
        fund_id: req.fund_id,
        type: "WITHDRAWAL",
        asset: req.funds?.asset || req.fund_class || req.currency,
        fund_class: req.fund_class || req.funds?.fund_class,
        amount: processedAmount,
        tx_date: new Date().toISOString().split("T")[0], // Column is tx_date, not occurred_at
        reference_id: withdrawalId,
        notes: adminNotes,
      });
    }
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
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (error) throw error;
  },

  /**
   * Mark withdrawal as completed
   */
  async markAsCompleted(withdrawalId: string, txHash?: string, adminNotes?: string): Promise<void> {
    // Fetch request details
    const { data: request, error: fetchError } = await supabase
      .from("withdrawal_requests")
      .select("*, funds(asset, fund_class)")
      .eq("id", withdrawalId)
      .single();
    if (fetchError) throw fetchError;

    const adminId = (await supabase.auth.getUser()).data.user?.id;
    const processedAmount = Number(request?.processed_amount || request?.requested_amount || 0);

    // Update request status and tx hash
    const { error: updateError } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "completed",
        processed_amount: processedAmount,
        processed_at: new Date().toISOString(),
        tx_hash: txHash,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
        approved_by: request?.approved_by || adminId,
        approved_at: request?.approved_at || new Date().toISOString(),
      })
      .eq("id", withdrawalId);
    if (updateError) throw updateError;

    // Adjust investor_positions balance
    if (request?.investor_id && request?.fund_id) {
      const { data: position } = await supabase
        .from("investor_positions")
        .select("shares, cost_basis, current_value")
        .eq("investor_id", request.investor_id)
        .eq("fund_id", request.fund_id)
        .maybeSingle();

      if (position) {
        const currentShares = Number(position.shares || 0);
        const currentCost = Number(position.cost_basis || 0);
        const currentValue = Number(position.current_value || 0);
        
        let newShares = currentShares;
        let newCostBasis = currentCost;
        let newCurrentValue = currentValue;

        if (currentShares > 0) {
            // Calculate proportional reduction
            const withdrawalRatio = Math.min(1, processedAmount / currentShares);
            
            newShares = Math.max(0, currentShares - processedAmount);
            newCostBasis = Math.max(0, currentCost - (currentCost * withdrawalRatio));
            newCurrentValue = Math.max(0, currentValue - (currentValue * withdrawalRatio));
        } else {
            // Edge case: shares are 0 but maybe value remains? Just zero out if full withdrawal intended or warn
            console.warn("Withdrawal processed for position with 0 shares");
        }

        await supabase
          .from("investor_positions")
          .update({
            shares: newShares,
            cost_basis: newCostBasis,
            current_value: newCurrentValue,
            updated_at: new Date().toISOString(),
          })
          .eq("investor_id", request.investor_id)
          .eq("fund_id", request.fund_id);
      }

      // Log transaction_v2 entry
      const { data: existingTx } = await supabase
        .from("transactions_v2")
        .select("id")
        .eq("reference_id", withdrawalId)
        .eq("type", "WITHDRAWAL")
        .maybeSingle();

      if (!existingTx) {
        await supabase.from("transactions_v2").insert({
          id: uuidv4(),
          investor_id: request.investor_id,
          fund_id: request.fund_id,
          type: "WITHDRAWAL",
          asset: request.funds?.asset || request.fund_class,
          fund_class: request.fund_class || request.funds?.fund_class,
          amount: processedAmount,
          tx_hash: txHash || request.tx_hash,
          tx_date: new Date().toISOString().split("T")[0], // Column is tx_date, not occurred_at
          reference_id: withdrawalId,
          notes: adminNotes,
        });
      }
    }
  },
};
