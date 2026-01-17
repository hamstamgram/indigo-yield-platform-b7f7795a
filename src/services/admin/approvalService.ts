/**
 * Approval Service
 * Handles 2-person rule approval workflow
 */

import { supabase } from "@/integrations/supabase/client";
import { callRPC } from "@/lib/supabase/typedRPC";
import { callRPCNoArgs } from "@/lib/supabase/typedRPC";
import { logError, logInfo } from "@/lib/logger";
import type { Json } from "@/integrations/supabase/types";
import type {
  PendingApproval,
  ApprovalHistoryItem,
  ApprovalThresholds,
  ApprovalIntegrityCheck,
  RequestApprovalInput,
  ApprovalOperationType,
} from "@/types/domains/approval";

export interface ApprovalResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/** RPC response wrapper type */
interface RPCResponseWrapper {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

class ApprovalService {
  /**
   * Get all pending approvals
   */
  async getPendingApprovals(): Promise<PendingApproval[]> {
    const { data, error } = await supabase
      .from("v_pending_approvals")
      .select("*")
      .order("requested_at", { ascending: false });

    if (error) {
      logError("getPendingApprovals", error);
      throw new Error(`Failed to fetch pending approvals: ${error.message}`);
    }

    return (data || []) as PendingApproval[];
  }

  /**
   * Get approval history
   */
  async getApprovalHistory(limit = 50): Promise<ApprovalHistoryItem[]> {
    const { data, error } = await supabase.from("v_approval_history").select("*").limit(limit);

    if (error) {
      logError("getApprovalHistory", error);
      throw new Error(`Failed to fetch approval history: ${error.message}`);
    }

    return (data || []) as ApprovalHistoryItem[];
  }

  /**
   * Get pending approvals for a specific user to action
   * (excludes their own requests since they can't approve them)
   */
  async getPendingForUser(userId: string): Promise<PendingApproval[]> {
    const { data, error } = await supabase
      .from("v_pending_approvals")
      .select("*")
      .neq("requested_by", userId)
      .order("requested_at", { ascending: false });

    if (error) {
      logError("getPendingForUser", error);
      throw new Error(`Failed to fetch pending approvals: ${error.message}`);
    }

    return (data || []) as PendingApproval[];
  }

  /**
   * Get user's own pending requests
   */
  async getMyPendingRequests(userId: string): Promise<PendingApproval[]> {
    const { data, error } = await supabase
      .from("v_pending_approvals")
      .select("*")
      .eq("requested_by", userId)
      .order("requested_at", { ascending: false });

    if (error) {
      logError("getMyPendingRequests", error);
      throw new Error(`Failed to fetch my pending requests: ${error.message}`);
    }

    return (data || []) as PendingApproval[];
  }

  /**
   * Request approval for an operation
   */
  async requestApproval(
    input: RequestApprovalInput,
    requesterId: string
  ): Promise<ApprovalResponse> {
    const { data, error } = await callRPC("request_approval", {
      p_action_type: input.actionType,
      p_entity_type: input.entityType,
      p_entity_id: input.entityId,
      p_requester_id: requesterId,
      p_reason: input.reason,
      p_metadata: (input.metadata ?? null) as unknown as Json,
      p_amount: input.amount || null,
      p_expiry_hours: input.expiryHours || 72,
    });

    if (error) {
      logError("requestApproval", error);
      throw new Error(`Failed to request approval: ${error.message}`);
    }

    const result = data as unknown as RPCResponseWrapper;

    if (!result.success) {
      return { success: false, error: result.error || "Unknown error" };
    }

    logInfo("requestApproval.success", {
      approvalId: result.data?.approval_id,
      actionType: input.actionType,
    });

    return { success: true, data: result.data };
  }

  /**
   * Approve a pending request
   */
  async approveRequest(
    approvalId: string,
    approverId: string,
    notes?: string
  ): Promise<ApprovalResponse> {
    const { data, error } = await callRPC("approve_request", {
      p_approval_id: approvalId,
      p_approver_id: approverId,
      p_notes: notes || null,
    });

    if (error) {
      logError("approveRequest", error);
      throw new Error(`Failed to approve request: ${error.message}`);
    }

    const result = data as unknown as RPCResponseWrapper;

    if (!result.success) {
      return { success: false, error: result.error || "Approval failed" };
    }

    logInfo("approveRequest.success", {
      approvalId,
      approverId,
      actionType: result.data?.action_type,
    });

    return { success: true, data: result.data };
  }

  /**
   * Reject a pending request
   */
  async rejectRequest(
    approvalId: string,
    rejectorId: string,
    rejectionReason: string
  ): Promise<ApprovalResponse> {
    const { data, error } = await callRPC("reject_request", {
      p_approval_id: approvalId,
      p_rejector_id: rejectorId,
      p_rejection_reason: rejectionReason,
    });

    if (error) {
      logError("rejectRequest", error);
      throw new Error(`Failed to reject request: ${error.message}`);
    }

    const result = data as unknown as RPCResponseWrapper;

    if (!result.success) {
      return { success: false, error: result.error || "Rejection failed" };
    }

    logInfo("rejectRequest.success", {
      approvalId,
      rejectorId,
      reason: rejectionReason,
    });

    return { success: true, data: result.data };
  }

  /**
   * Check if an operation requires approval
   */
  async requiresApproval(operationType: string, amount?: number): Promise<boolean> {
    const { data, error } = await callRPC("requires_dual_approval", {
      p_operation: operationType,
      p_amount: amount || null,
    });

    if (error) {
      logError("requiresApproval", error);
      return true; // Default to requiring approval on error
    }

    return data as boolean;
  }

  /**
   * Check if valid approval exists for an entity
   */
  async hasValidApproval(
    entityType: string,
    entityId: string,
    actionType: string
  ): Promise<boolean> {
    const { data, error } = await callRPC("has_valid_approval", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_action_type: actionType,
    });

    if (error) {
      logError("hasValidApproval", error);
      return false;
    }

    return data as boolean;
  }

  /**
   * Get approval thresholds configuration
   */
  async getThresholds(): Promise<ApprovalThresholds | null> {
    const { data, error } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "approval_thresholds")
      .single();

    if (error) {
      logError("getThresholds", error);
      return null;
    }

    return data?.value as unknown as ApprovalThresholds;
  }

  /**
   * Run approval integrity checks
   */
  async checkIntegrity(): Promise<ApprovalIntegrityCheck[]> {
    const { data, error } = await callRPCNoArgs("check_approval_integrity");

    if (error) {
      logError("checkIntegrity", error);
      throw new Error(`Failed to check approval integrity: ${error.message}`);
    }

    return (data || []) as ApprovalIntegrityCheck[];
  }

  /**
   * Cleanup expired approvals
   */
  async cleanupExpired(): Promise<{ expiredCount: number }> {
    const { data, error } = await callRPCNoArgs("cleanup_expired_approvals");

    if (error) {
      logError("cleanupExpired", error);
      throw new Error(`Failed to cleanup expired approvals: ${error.message}`);
    }

    const result = data as { expired_count: number };
    return { expiredCount: result?.expired_count || 0 };
  }

  /**
   * Lock period with approval (convenience wrapper)
   */
  async lockPeriodWithApproval(
    fundId: string,
    periodStart: string,
    periodEnd: string,
    adminId: string,
    notes?: string
  ): Promise<ApprovalResponse> {
    const { data, error } = await callRPC("lock_period_with_approval", {
      p_fund_id: fundId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_admin_id: adminId,
      p_notes: notes || null,
    });

    if (error) {
      logError("lockPeriodWithApproval", error);
      throw new Error(`Failed to lock period: ${error.message}`);
    }

    const result = data as unknown as RPCResponseWrapper;

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * Void transaction with approval (convenience wrapper)
   */
  async voidTransactionWithApproval(
    transactionId: string,
    adminId: string,
    reason: string
  ): Promise<ApprovalResponse> {
    const { data, error } = await callRPC("void_transaction_with_approval", {
      p_transaction_id: transactionId,
      p_admin_id: adminId,
      p_reason: reason,
    });

    if (error) {
      logError("voidTransactionWithApproval", error);
      throw new Error(`Failed to void transaction: ${error.message}`);
    }

    const result = data as unknown as RPCResponseWrapper;

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * Finalize reconciliation pack with approval (convenience wrapper)
   */
  async finalizePackWithApproval(packId: string, adminId: string): Promise<ApprovalResponse> {
    const { data, error } = await callRPC("finalize_reconciliation_pack", {
      p_pack_id: packId,
      p_admin_id: adminId,
    });

    if (error) {
      logError("finalizePackWithApproval", error);
      throw new Error(`Failed to finalize pack: ${error.message}`);
    }

    const result = data as unknown as RPCResponseWrapper;

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * Get count of pending approvals for badge display
   */
  async getPendingCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("admin_approvals")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending")
      .neq("requested_by", userId);

    if (error) {
      logError("getPendingCount", error);
      return 0;
    }

    return count ?? 0;
  }
}

export const approvalService = new ApprovalService();
