export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled";

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
  processed_date?: string | null;
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
  status?: WithdrawalStatus | "all";
  fund_id?: string;
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
