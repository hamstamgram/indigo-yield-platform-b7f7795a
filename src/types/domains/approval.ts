/**
 * Approval System Types
 * 2-Person Rule enforcement for high-risk operations
 */

export type ApprovalOperationType =
  | "PERIOD_LOCK"
  | "PERIOD_UNLOCK"
  | "LARGE_WITHDRAWAL"
  | "LARGE_DEPOSIT"
  | "STAGING_PROMOTION"
  | "FEE_STRUCTURE_CHANGE"
  | "RECONCILIATION_FINALIZE"
  | "VOID_TRANSACTION"
  | "BULK_OPERATION"
  | "MFA_RESET";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export type ApprovalExpiryStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED" | null;

export interface ApprovalRequest {
  id: string;
  action_type: ApprovalOperationType;
  entity_type: string;
  entity_id: string;
  requested_by: string;
  approved_by?: string;
  approval_status: ApprovalStatus;
  reason: string;
  rejection_reason?: string;
  metadata?: Record<string, unknown>;
  /** @precision NUMERIC(28,10) - use string for precision */
  threshold_value?: string;
  /** @precision NUMERIC(28,10) - use string for precision */
  actual_value?: string;
  requested_at: string;
  resolved_at?: string;
  expires_at?: string;
  approval_signature?: string;
}

export interface PendingApproval {
  approval_id: string;
  action_type: ApprovalOperationType;
  entity_type: string;
  entity_id: string;
  requested_by: string;
  requester_name: string;
  requester_email: string;
  reason: string;
  metadata?: Record<string, unknown>;
  /** @precision NUMERIC(28,10) - may come as number from DB */
  actual_value?: string | number | null;
  /** @precision NUMERIC(28,10) - may come as number from DB */
  threshold_value?: string | number | null;
  requested_at: string;
  expires_at?: string;
  expiry_status: ApprovalExpiryStatus;
  action_description: string;
}

export interface ApprovalHistoryItem {
  approval_id: string;
  action_type: ApprovalOperationType;
  entity_type: string;
  entity_id: string;
  approval_status: ApprovalStatus;
  requested_by: string;
  requester_name: string;
  approved_by?: string;
  approver_name: string;
  reason: string;
  rejection_reason?: string;
  /** @precision NUMERIC(28,10) - may come as number from DB */
  actual_value?: string | number | null;
  requested_at: string;
  resolved_at?: string;
  approval_signature?: string;
  metadata?: Record<string, unknown>;
}

export interface RequestApprovalInput {
  actionType: ApprovalOperationType;
  entityType: string;
  entityId: string;
  reason: string;
  metadata?: Record<string, unknown>;
  /** @precision NUMERIC(28,10) - use string for precision */
  amount?: string;
  expiryHours?: number;
}

export interface ApprovalThresholds {
  /** @precision NUMERIC(28,10) - use string for precision */
  withdrawal_amount: string;
  /** @precision NUMERIC(28,10) - use string for precision */
  deposit_amount: string;
  period_lock: number;
  period_unlock: number;
  staging_promotion: number;
  fee_structure_change: number;
  reconciliation_finalize: number;
  void_transaction: number;
  bulk_operation_count: number;
}

export interface ApprovalIntegrityCheck {
  check_name: string;
  status: "PASS" | "FAIL" | "WARN";
  violation_count: number;
  details: Record<string, unknown>[];
}

// Action descriptions mapping
export const APPROVAL_ACTION_DESCRIPTIONS: Record<ApprovalOperationType, string> = {
  PERIOD_LOCK: "Lock Accounting Period",
  PERIOD_UNLOCK: "Unlock Accounting Period",
  LARGE_WITHDRAWAL: "Large Withdrawal",
  LARGE_DEPOSIT: "Large Deposit",
  STAGING_PROMOTION: "Promote Staging Batch",
  FEE_STRUCTURE_CHANGE: "Fee Structure Change",
  RECONCILIATION_FINALIZE: "Finalize Reconciliation",
  VOID_TRANSACTION: "Void Transaction",
  BULK_OPERATION: "Bulk Operation",
  MFA_RESET: "MFA Reset",
};

// Helper to check if approval error code indicates approval needed
export function isApprovalRequired(errorCode: string): boolean {
  return errorCode === "APPROVAL_REQUIRED" || errorCode === "APPROVAL_PENDING";
}

// Helper to check if user can approve (not the requester)
export function canUserApprove(approval: PendingApproval, userId: string): boolean {
  return approval.requested_by !== userId;
}
