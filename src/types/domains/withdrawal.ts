/**
 * Withdrawal Domain Types
 * Types for withdrawal requests and management
 */

// Re-use status from requests domain
import type { WithdrawalStatus } from "./requests";
export type { WithdrawalStatus };

// Extended status with cancelled and voided for full workflow
export type WithdrawalFullStatus = WithdrawalStatus | "cancelled" | "voided";

export interface Withdrawal {
  id: string;
  investor_id: string;
  fund_id: string;
  fund_class: string | null;
  requested_amount: number;
  processed_amount?: number | null;
  withdrawal_type: string;
  status: WithdrawalStatus;
  notes: string | null;
  admin_notes: string | null;
  request_date: string;
  processed_at?: string | null;
  tx_hash: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
  approved_by: string | null;
  rejected_by: string | null;
  cancelled_by: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Joined data
  investor_name?: string;
  investor_email?: string;
  fund_name?: string;
  fund_code?: string;
  asset?: string;
}

export interface WithdrawalFilters {
  search?: string;
  status?: WithdrawalFullStatus | "all";
  fund_id?: string;
  page?: number;
  pageSize?: number;
}

export interface PendingByAsset {
  asset: string;
  amount: number;
}

export interface WithdrawalStats {
  pending: number;
  approved: number;
  processing: number;
  completed: number;
  rejected: number;
  pending_by_asset: PendingByAsset[];
}

export interface PaginatedWithdrawals {
  data: Withdrawal[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type WithdrawalAuditAction =
  | "create"
  | "approve"
  | "reject"
  | "processing"
  | "complete"
  | "cancel"
  | "update";

export interface WithdrawalAuditLog {
  id: string;
  request_id: string;
  action: WithdrawalAuditAction;
  actor_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
  actor_name?: string;
  actor_email?: string;
}

// Types for withdrawal form data (specific to withdrawal UI)
export interface InvestorOption {
  id: string;
  email: string;
  displayName: string;
}

// Position type for withdrawal form (simplified version for dropdowns)
export interface WithdrawalInvestorPosition {
  fund_id: string;
  current_value: number;
  shares: number;
  fund: {
    name: string;
    code: string;
    asset: string;
  };
}

// Types for withdrawal mutations
export interface CreateWithdrawalParams {
  investorId: string;
  fundId: string;
  amount: number;
  withdrawalType: "partial" | "full";
  notes?: string;
}

export interface UpdateWithdrawalParams {
  withdrawalId: string;
  requestedAmount: number;
  withdrawalType: string;
  notes?: string;
  reason: string;
}

export interface DeleteWithdrawalParams {
  withdrawalId: string;
  reason: string;
  hardDelete?: boolean;
}

export interface RouteToFeesParams {
  withdrawalId: string;
  reason?: string;
}
