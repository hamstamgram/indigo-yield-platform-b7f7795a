import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";
import {
  Withdrawal,
  WithdrawalFilters,
  WithdrawalStats,
  PaginatedWithdrawals,
  WithdrawalAuditLog,
  InvestorOption,
  WithdrawalInvestorPosition,
  CreateWithdrawalParams,
  UpdateWithdrawalParams,
  DeleteWithdrawalParams,
  RouteToFeesParams,
} from "@/types/domains";
import { generateCorrelationId, createCorrelatedLogger } from "@/lib/correlationId";
import type { Database } from "@/integrations/supabase/types";

const DEFAULT_PAGE_SIZE = 20;

/**
 * Build correlation metadata for audit logging
 */
function buildAuditMeta(correlationId: string, action: string, details?: Record<string, unknown>) {
  return {
    correlation_id: correlationId,
    action,
    timestamp: new Date().toISOString(),
    ...details,
  };
}

export const withdrawalService = {
  /**
   * Get paginated withdrawal requests with optional filters
   */
  async getWithdrawals(filters?: WithdrawalFilters): Promise<PaginatedWithdrawals> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query with count
    let query = supabase
      .from("withdrawal_requests")
      .select(
        "*, profile:profiles!fk_withdrawal_requests_profile(first_name, last_name, email), fund:funds(name, code, asset)",
        { count: "exact" }
      )
      .order("request_date", { ascending: false })
      .range(from, to);

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.fund_id) {
      query = query.eq("fund_id", filters.fund_id);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Map the joined data to flat structure
    let withdrawals = (data || []).map((withdrawal) => {
      const profile = withdrawal.profile as {
        first_name?: string;
        last_name?: string;
        email?: string;
      } | null;
      const fund = withdrawal.fund as {
        name?: string;
        code?: string;
        asset?: string;
      } | null;

      const investor_name =
        profile?.first_name || profile?.last_name
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
          : profile?.email || "Unknown";

      const { profile: _p, fund: _f, ...rest } = withdrawal;
      // Convert number fields to strings for type compatibility
      const typedRest = {
        ...rest,
        requested_amount: String(rest.requested_amount),
        processed_amount: rest.processed_amount != null ? String(rest.processed_amount) : null,
      };
      return {
        ...typedRest,
        investor_name,
        investor_email: profile?.email || "",
        fund_name: fund?.name || "",
        fund_code: fund?.code || "",
        asset: fund?.asset || "",
      } as Withdrawal;
    });

    // Apply search filter (client-side for now, already paginated)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      withdrawals = withdrawals.filter(
        (w) =>
          w.investor_name?.toLowerCase().includes(searchLower) ||
          w.investor_email?.toLowerCase().includes(searchLower) ||
          w.id.toLowerCase().includes(searchLower)
      );
    }

    const totalCount = count || 0;

    return {
      data: withdrawals,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  },

  /**
   * Get a single withdrawal by ID with full details
   */
  async getWithdrawalById(id: string): Promise<Withdrawal | null> {
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select(
        "*, profile:profiles!fk_withdrawal_requests_profile(first_name, last_name, email), fund:funds(name, code, asset)"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const profile = data.profile as {
      first_name?: string;
      last_name?: string;
      email?: string;
    } | null;
    const fund = data.fund as {
      name?: string;
      code?: string;
      asset?: string;
    } | null;

    const investor_name =
      profile?.first_name || profile?.last_name
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : profile?.email || "Unknown";

    const { profile: _p, fund: _f, ...rest } = data;
    // Convert number fields to strings for type compatibility
    const typedRest = {
      ...rest,
      requested_amount: String(rest.requested_amount),
      processed_amount: rest.processed_amount != null ? String(rest.processed_amount) : null,
    };
    return {
      ...typedRest,
      investor_name,
      investor_email: profile?.email || "",
      fund_name: fund?.name || "",
      fund_code: fund?.code || "",
      asset: fund?.asset || "",
    } as Withdrawal;
  },

  /**
   * Get audit logs for a specific withdrawal
   */
  async getWithdrawalAuditLogs(withdrawalId: string): Promise<WithdrawalAuditLog[]> {
    const { data, error } = await supabase
      .from("withdrawal_audit_logs")
      .select("*, actor:profiles!withdrawal_audit_logs_actor_id_fkey(first_name, last_name, email)")
      .eq("request_id", withdrawalId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map((log) => {
      const actor = log.actor as {
        first_name?: string;
        last_name?: string;
        email?: string;
      } | null;

      const actor_name =
        actor?.first_name || actor?.last_name
          ? `${actor.first_name || ""} ${actor.last_name || ""}`.trim()
          : actor?.email || "System";

      const { actor: _a, ...rest } = log;
      return {
        ...rest,
        action: log.action as WithdrawalAuditLog["action"],
        details: log.details as Record<string, unknown> | null,
        actor_name,
        actor_email: actor?.email || "",
      } as WithdrawalAuditLog;
    });
  },

  /**
   * Get withdrawal statistics with per-asset pending breakdown
   * Accepts optional filters to match the list query for consistency
   */
  async getStats(filters?: WithdrawalFilters): Promise<WithdrawalStats> {
    let query = supabase
      .from("withdrawal_requests")
      .select("status, requested_amount, fund:funds(asset)");

    // Apply same filters as getWithdrawals for consistency
    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.fund_id) {
      query = query.eq("fund_id", filters.fund_id);
    }

    const { data, error } = await query;

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
      const status = withdrawal.status as keyof Pick<
        WithdrawalStats,
        "pending" | "approved" | "processing" | "completed" | "rejected"
      >;
      if (status in stats && typeof stats[status] === "number") {
        (stats[status] as number)++;
      }
      // Group pending amounts by asset
      if (withdrawal.status === "pending" || withdrawal.status === "approved") {
        const asset = (withdrawal.fund as { asset?: string } | null)?.asset || "Unknown";
        assetAmounts[asset] = (assetAmounts[asset] || 0) + (withdrawal.requested_amount || 0);
      }
    });

    // Convert to array sorted by asset name
    stats.pending_by_asset = Object.entries(assetAmounts)
      .map(([asset, amount]) => ({ asset, amount: String(amount) }))
      .sort((a, b) => a.asset.localeCompare(b.asset));

    return stats;
  },

  /**
   * Approve a withdrawal request using secure RPC with server-side admin check
   */
  async approveWithdrawal(
    withdrawalId: string,
    processedAmount: number,
    adminNotes?: string,
    correlationId?: string
  ): Promise<{ correlationId: string }> {
    const corrId = correlationId || generateCorrelationId("wdr_appr");
    const log = createCorrelatedLogger(corrId);

    log.info("Approving withdrawal", { withdrawalId, processedAmount });

    const { error } = await rpc.call("approve_withdrawal", {
      p_request_id: withdrawalId,
      p_approved_amount: processedAmount,
      p_admin_notes: adminNotes ? `${adminNotes} [${corrId}]` : `[${corrId}]`,
    });

    if (error) {
      log.error("Error approving withdrawal", error);
      const errorMessage = error.message || "Failed to approve withdrawal";
      throw new Error(
        errorMessage.includes("Admin only")
          ? "You don't have admin privileges to approve withdrawals"
          : errorMessage
      );
    }

    log.info("Withdrawal approved successfully");
    return { correlationId: corrId };
  },

  /**
   * Reject a withdrawal request using secure RPC with server-side admin check
   */
  async rejectWithdrawal(
    withdrawalId: string,
    reason: string,
    adminNotes?: string,
    correlationId?: string
  ): Promise<{ correlationId: string }> {
    const corrId = correlationId || generateCorrelationId("wdr_rej");
    const log = createCorrelatedLogger(corrId);

    log.info("Rejecting withdrawal", { withdrawalId, reason });

    const { error } = await rpc.call("reject_withdrawal", {
      p_request_id: withdrawalId,
      p_reason: reason,
      p_admin_notes: adminNotes ? `${adminNotes} [${corrId}]` : `[${corrId}]`,
    });

    if (error) {
      log.error("Error rejecting withdrawal", error);
      const errorMessage = error.message || "Failed to reject withdrawal";
      throw new Error(
        errorMessage.includes("Admin only")
          ? "You don't have admin privileges to reject withdrawals"
          : errorMessage
      );
    }

    log.info("Withdrawal rejected successfully");
    return { correlationId: corrId };
  },

  /**
   * Mark withdrawal as processing using secure RPC with server-side admin check
   */
  async markAsProcessing(
    withdrawalId: string,
    txHash?: string,
    adminNotes?: string,
    correlationId?: string
  ): Promise<{ correlationId: string }> {
    const corrId = correlationId || generateCorrelationId("wdr_proc");
    const log = createCorrelatedLogger(corrId);

    log.info("Starting withdrawal processing", { withdrawalId, txHash });

    const { error } = await rpc.call("start_processing_withdrawal", {
      p_request_id: withdrawalId,
      p_processed_amount: null,
      p_tx_hash: txHash || null,
      p_settlement_date: null,
      p_admin_notes: adminNotes ? `${adminNotes} [${corrId}]` : `[${corrId}]`,
    });

    if (error) {
      log.error("Error marking withdrawal as processing", error);
      const errorMessage = error.message || "Failed to start processing withdrawal";
      throw new Error(
        errorMessage.includes("Admin only")
          ? "You don't have admin privileges to process withdrawals"
          : errorMessage.includes("approved")
            ? "Withdrawal must be approved before processing"
            : errorMessage
      );
    }

    log.info("Withdrawal marked as processing");
    return { correlationId: corrId };
  },

  /**
   * Mark withdrawal as completed using secure RPC with server-side admin check
   */
  async markAsCompleted(
    withdrawalId: string,
    closingAum: string,
    txHash?: string,
    adminNotes?: string,
    correlationId?: string
  ): Promise<{ correlationId: string }> {
    const corrId = correlationId || generateCorrelationId("wdr_comp");
    const log = createCorrelatedLogger(corrId);

    log.info("Completing withdrawal", { withdrawalId, txHash });

    const { error } = await rpc.call("complete_withdrawal", {
      p_request_id: withdrawalId,
      p_closing_aum: parseFloat(closingAum),
      p_event_ts: new Date().toISOString(),
      p_transaction_hash: txHash || null,
      p_admin_notes: adminNotes ? `${adminNotes} [${corrId}]` : `[${corrId}]`,
    });

    if (error) {
      log.error("Error completing withdrawal", error);
      const errorMessage = error.message || "Failed to complete withdrawal";
      throw new Error(
        errorMessage.includes("Admin only")
          ? "You don't have admin privileges to complete withdrawals"
          : errorMessage.includes("processing")
            ? "Withdrawal must be in processing state before completing"
            : errorMessage
      );
    }

    log.info("Withdrawal completed successfully");
    return { correlationId: corrId };
  },

  /**
   * Cancel a withdrawal request using secure RPC with server-side admin check
   */
  async cancelWithdrawal(
    withdrawalId: string,
    reason: string,
    adminNotes?: string,
    correlationId?: string
  ): Promise<{ correlationId: string }> {
    const corrId = correlationId || generateCorrelationId("wdr_canc");
    const log = createCorrelatedLogger(corrId);

    log.info("Cancelling withdrawal", { withdrawalId, reason });

    const { error } = await rpc.call("cancel_withdrawal_by_admin", {
      p_request_id: withdrawalId,
      p_reason: reason,
      p_admin_notes: adminNotes ? `${adminNotes} [${corrId}]` : `[${corrId}]`,
    });

    if (error) {
      log.error("Error cancelling withdrawal", error);
      const errorMessage = error.message || "Failed to cancel withdrawal";
      throw new Error(
        errorMessage.includes("Admin only")
          ? "You don't have admin privileges to cancel withdrawals"
          : errorMessage
      );
    }

    log.info("Withdrawal cancelled successfully");
    return { correlationId: corrId };
  },

  // REMOVED: fetchInvestorOptions() - Use fetchInvestorsForSelector from investorDataService directly

  /**
   * Fetch investor positions with positive balance for withdrawal forms
   * Returns only positions with current_value > 0
   */
  async fetchPositionsForWithdrawal(investorId: string): Promise<WithdrawalInvestorPosition[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        `
        fund_id,
        current_value,
        shares,
        funds:fund_id (
          name,
          code,
          asset
        )
      `
      )
      .eq("investor_id", investorId)
      .gt("current_value", 0);

    if (error) throw error;

    return (data || []).map((p: any) => ({
      fund_id: p.fund_id,
      current_value: String(p.current_value || 0),
      shares: String(p.shares || 0),
      fund: p.funds || { name: "Unknown", code: "UNK", asset: "N/A" },
    }));
  },

  /**
   * Create a new withdrawal request via RPC
   * Uses idempotency key to prevent duplicate requests from double-clicks
   */
  async createWithdrawal(
    params: CreateWithdrawalParams & { idempotencyKey?: string }
  ): Promise<void> {
    const corrId = params.idempotencyKey || generateCorrelationId("wdr_create");

    const { error } = await rpc.call("create_withdrawal_request", {
      p_investor_id: params.investorId,
      p_fund_id: params.fundId,
      p_amount: typeof params.amount === "string" ? parseFloat(params.amount) : params.amount,
      p_type: params.withdrawalType,
      p_notes: params.notes ? `${params.notes} [${corrId}]` : `[${corrId}]`,
    });

    if (error) throw error;
  },

  /**
   * Route a withdrawal to INDIGO FEES account via RPC
   * Requires super_admin role - actorId is used for authorization check
   */
  async routeToFees(params: RouteToFeesParams): Promise<void> {
    const { error } = await rpc.call("route_withdrawal_to_fees", {
      p_request_id: params.withdrawalId,
      p_actor_id: params.actorId,
      p_reason: params.reason || "Routed to INDIGO FEES",
    });

    if (error) throw error;
  },

  /**
   * Update an existing withdrawal request via RPC
   */
  async updateWithdrawal(params: UpdateWithdrawalParams): Promise<void> {
    const { error } = await rpc.call("update_withdrawal", {
      p_withdrawal_id: params.withdrawalId,
      p_requested_amount:
        typeof params.requestedAmount === "string"
          ? parseFloat(params.requestedAmount)
          : params.requestedAmount,
      p_withdrawal_type: params.withdrawalType,
      p_notes: params.notes || null,
      p_reason: params.reason,
    });

    if (error) throw error;
  },

  /**
   * Delete or cancel a withdrawal request via RPC
   */
  async deleteWithdrawal(params: DeleteWithdrawalParams): Promise<void> {
    const { error } = await rpc.call("delete_withdrawal", {
      p_withdrawal_id: params.withdrawalId,
      p_reason: params.reason,
      p_hard_delete: params.hardDelete || false,
    });

    if (error) throw error;
  },

  // ============================================================
  // INVESTOR PORTAL METHODS (for investor-facing pages)
  // ============================================================

  /**
   * Get investor's own withdrawal history with optional search
   */
  async getInvestorWithdrawals(investorId: string, search?: string) {
    let query = supabase
      .from("withdrawal_requests")
      .select(`*, funds:fund_id(name, code)`)
      .eq("investor_id", investorId);

    if (search) {
      query = query.ilike("notes", `%${search}%`);
    }

    const { data, error } = await query.order("request_date", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Get investor's available positions for withdrawal (shares > 0)
   */
  async getInvestorWithdrawalPositions(investorId: string) {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(`fund_id, shares, current_value, funds ( asset )`)
      .eq("investor_id", investorId)
      .gt("shares", 0);

    if (error) throw error;

    return (data || []).map((pos: any) => ({
      fund_id: pos.fund_id,
      asset_symbol: pos.funds?.asset || "UNKNOWN",
      amount: Number(pos.shares),
    }));
  },

  /**
   * Check if user has MFA enabled
   */
  async hasMFAEnabled(): Promise<boolean> {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = (factors as any)?.find(
      (f: any) => f.factor_type === "totp" && f.status === "verified"
    );
    return Boolean(totpFactor);
  },

  /**
   * Verify MFA TOTP code for withdrawal submission
   * SECURITY: Users without MFA must enable it before withdrawing
   */
  async verifyMFAForWithdrawal(
    totpCode: string
  ): Promise<{ verified: boolean; error?: string; requiresMfaSetup?: boolean }> {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = (factors as any)?.find(
      (f: any) => f.factor_type === "totp" && f.status === "verified"
    );

    if (!totpFactor) {
      // SECURITY FIX: Do NOT allow withdrawal without MFA
      console.warn("No verified TOTP factor found for user - MFA required for withdrawals");
      return {
        verified: false,
        error:
          "Two-factor authentication (2FA) is required for withdrawals. Please enable 2FA in your security settings first.",
        requiresMfaSetup: true,
      };
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totpFactor.id,
      code: totpCode,
    });

    if (verifyError) {
      return { verified: false, error: "Invalid 2FA code" };
    }

    return { verified: true };
  },

  /**
   * Submit investor withdrawal request (for investor portal)
   */
  async submitInvestorWithdrawal(params: {
    fundId: string;
    amount: number;
    destinationAddress?: string;
    reason?: string;
    notes?: string;
    totpCode?: string;
  }): Promise<string> {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const investorId = user.id;

    // Verify TOTP if provided
    if (params.totpCode) {
      const mfaResult = await withdrawalService.verifyMFAForWithdrawal(params.totpCode);
      if (!mfaResult.verified) {
        throw new Error(mfaResult.error || "MFA verification failed");
      }
    }

    // Combine notes with destination and reason
    const combinedNotes = [
      params.reason ? `Reason: ${params.reason}` : null,
      params.destinationAddress ? `Destination: ${params.destinationAddress}` : null,
      params.notes || null,
    ]
      .filter(Boolean)
      .join("\n");

    // Generate idempotency key to prevent duplicate requests from double-clicks
    const idempotencyKey = generateCorrelationId("inv_wdr");

    // Create withdrawal via RPC
    const { data: requestId, error: rpcError } = await rpc.call("create_withdrawal_request", {
      p_investor_id: investorId,
      p_fund_id: params.fundId,
      p_amount: params.amount,
      p_type: "partial",
      p_notes: combinedNotes ? `${combinedNotes} [${idempotencyKey}]` : `[${idempotencyKey}]`,
    });

    if (rpcError) throw rpcError;

    return requestId as string;
  },
};
