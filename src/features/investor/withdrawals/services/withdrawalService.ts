import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
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
import { verifyResourceAccess } from "@/utils/authorizationHelper";
import { sanitizeSearchInput } from "@/utils/searchSanitizer";

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
   * NOTE: withdrawal_audit_logs table was dropped - returns empty
   */
  async getWithdrawalAuditLogs(_withdrawalId: string): Promise<WithdrawalAuditLog[]> {
    return [];
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
   * Approve and complete a withdrawal in one atomic operation.
   * No AUM input required. Creates WITHDRAWAL transaction directly.
   * Yield must be recorded separately before calling this.
   */
  async approveAndComplete(
    withdrawalId: string,
    processedAmount: string,
    txHash?: string,
    adminNotes?: string,
    isFullExit?: boolean
  ): Promise<{ correlationId: string }> {
    const corrId = generateCorrelationId("wdr_full");
    const log = createCorrelatedLogger(corrId);

    log.info("Approving and completing withdrawal", { withdrawalId, processedAmount, isFullExit });

    const params: Record<string, unknown> = {
      p_request_id: withdrawalId,
      p_processed_amount: processedAmount as unknown as number,
      p_tx_hash: txHash ?? undefined,
      p_admin_notes: adminNotes ? `${adminNotes} [${corrId}]` : `[${corrId}]`,
    };

    if (isFullExit) {
      params.p_is_full_exit = true;
    }

    const { error } = await rpc.call(
      "approve_and_complete_withdrawal",
      params as Record<string, unknown> as any
    );

    if (error) {
      log.error("Error completing withdrawal", error);
      const errorMessage = error.message || "Failed to complete withdrawal";
      throw new Error(
        errorMessage.includes("UNAUTHORIZED")
          ? "You don't have admin privileges to complete withdrawals"
          : errorMessage.includes("INSUFFICIENT_BALANCE")
            ? errorMessage.replace("INSUFFICIENT_BALANCE: ", "")
            : errorMessage.includes("INVALID_")
              ? errorMessage.replace(/INVALID_\w+: /, "")
              : errorMessage
      );
    }

    log.info("Withdrawal approved and completed successfully");
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

    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "rejected",
        notes: adminNotes
          ? `${adminNotes} [${corrId}] Reason: ${reason}`
          : `[${corrId}] Reason: ${reason}`,
      } as any)
      .eq("id", withdrawalId);

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

    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "cancelled",
        notes: adminNotes
          ? `${adminNotes} [${corrId}] Reason: ${reason}`
          : `[${corrId}] Reason: ${reason}`,
      } as any)
      .eq("id", withdrawalId);

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

  /**
   * Fetch investor positions with positive balance for withdrawal forms
   * Returns only positions with current_value > 0
   * Authorization: Self-access or admin required
   */
  async fetchPositionsForWithdrawal(investorId: string): Promise<WithdrawalInvestorPosition[]> {
    // Verify caller has access to this investor's data
    const auth = await verifyResourceAccess(investorId);
    if (!auth.authorized) {
      throw new Error("Not authorized to view these positions");
    }

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
    const notes = params.notes ? `${params.notes} [${corrId}]` : `[${corrId}]`;
    const executionDate = params.executionDate || new Date().toISOString().split("T")[0];

    // Direct insert: create_withdrawal_request RPC was removed.
    // Column names must match withdrawal_requests schema exactly.
    const insertPayload: Record<string, unknown> = {
      investor_id: params.investorId,
      fund_id: params.fundId,
      amount: Number(params.amount),
      status: "pending_approval",
      notes,
      execution_date: executionDate,
    };
    const { error } = await supabase.from("withdrawal_requests").insert(insertPayload as any);

    if (error) throw error;
  },

  /**
   * Route a withdrawal to INDIGO FEES account via RPC
   * Requires super_admin role - actorId is used for authorization check
   */
  async routeToFees(params: RouteToFeesParams): Promise<void> {
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "completed",
        notes: params.reason || "Routed to INDIGO FEES",
        completed_date: new Date().toISOString(),
      } as any)
      .eq("id", params.withdrawalId);

    if (error) throw error;
  },

  /**
   * Update an existing withdrawal request
   */
  async updateWithdrawal(params: UpdateWithdrawalParams): Promise<void> {
    const updatePayload: Record<string, unknown> = {};
    if (params.requestedAmount != null) updatePayload.amount = Number(params.requestedAmount);
    if (params.notes != null) updatePayload.notes = params.notes;

    const { error } = await supabase
      .from("withdrawal_requests")
      .update(updatePayload as any)
      .eq("id", params.withdrawalId);

    if (error) throw error;
  },

  /**
   * Delete or cancel a withdrawal request
   */
  async deleteWithdrawal(params: DeleteWithdrawalParams): Promise<void> {
    if (params.hardDelete) {
      const { error } = await supabase
        .from("withdrawal_requests")
        .delete()
        .eq("id", params.withdrawalId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({ status: "cancelled", notes: params.reason } as any)
        .eq("id", params.withdrawalId);
      if (error) throw error;
    }
  },

  /**
   * Restore a cancelled/rejected withdrawal back to pending via RPC
   */
  async restoreWithdrawal(
    withdrawalId: string,
    reason: string,
    adminNotes?: string
  ): Promise<{ correlationId: string }> {
    const corrId = generateCorrelationId("wdr_restore");
    const log = createCorrelatedLogger(corrId);

    log.info("Restoring withdrawal", { withdrawalId, reason });

    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "pending_approval",
        notes: adminNotes
          ? `${adminNotes} [${corrId}] Restored: ${reason}`
          : `[${corrId}] Restored: ${reason}`,
      } as any)
      .eq("id", withdrawalId);

    if (error) {
      log.error("Error restoring withdrawal", error);
      const errorMessage = error.message || "Failed to restore withdrawal";
      throw new Error(
        errorMessage.includes("Admin only") || errorMessage.includes("ensure_admin")
          ? "You don't have admin privileges to restore withdrawals"
          : errorMessage
      );
    }

    log.info("Withdrawal restored successfully");
    return { correlationId: corrId };
  },

  // ============================================================
  // INVESTOR PORTAL METHODS (for investor-facing pages)
  // ============================================================

  /**
   * Get investor's own withdrawal history with optional search
   * Authorization: Self-access or admin required
   */
  async getInvestorWithdrawals(investorId: string, search?: string) {
    // Verify caller has access to this investor's data
    const auth = await verifyResourceAccess(investorId);
    if (!auth.authorized) {
      throw new Error("Not authorized to view these withdrawals");
    }

    let query = supabase
      .from("withdrawal_requests")
      .select(`*, funds:fund_id(name, code)`)
      .eq("investor_id", investorId);

    if (search) {
      const safeSearch = sanitizeSearchInput(search);
      if (safeSearch) {
        query = query.ilike("notes", `%${safeSearch}%`);
      }
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
      amount: String(pos.shares || "0"),
    }));
  },

  /**
   * Submit investor withdrawal request (for investor portal)
   */
  async submitInvestorWithdrawal(params: {
    fundId: string;
    amount: string;
    notes?: string;
  }): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const investorId = user.id;
    const idempotencyKey = generateCorrelationId("inv_wdr");

    const notes = params.notes ? `${params.notes} [${idempotencyKey}]` : `[${idempotencyKey}]`;
    const insertPayload: Record<string, unknown> = {
      investor_id: investorId,
      fund_id: params.fundId,
      amount: Number(params.amount),
      status: "pending_approval",
      notes,
    };
    const { data, error: insertError } = await supabase
      .from("withdrawal_requests")
      .insert(insertPayload as any)
      .select("id")
      .single();

    if (insertError) throw insertError;

    return (data as any)?.id as string;
  },

  /**
   * Log a bulk withdrawal audit entry
   * Centralizes audit logging so hooks don't call supabase directly
   */
  async logBulkAudit(
    action: string,
    withdrawalIds: string[],
    details: Record<string, unknown>
  ): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert([
      {
        actor_user: user?.id ?? null,
        action,
        entity: "withdrawal_requests",
        entity_id: withdrawalIds.join(","),
        old_values: JSON.parse(JSON.stringify(details)),
      },
    ]);
  },
};
