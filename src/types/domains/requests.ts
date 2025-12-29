/**
 * Requests Domain Types
 * Types for withdrawal and deposit request management
 */

// ============================================================================
// Withdrawal Types
// ============================================================================

export type WithdrawalStatus = "pending" | "approved" | "rejected" | "completed" | "processing";

export interface WithdrawalRequestProfile {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export interface WithdrawalRequestFund {
  name: string;
  fund_class: string;
}

export interface WithdrawalRequest {
  id: string;
  investor_id: string;
  fund_id: string;
  requested_amount: number;
  status: WithdrawalStatus;
  withdrawal_type: string;
  fund_class: string;
  notes?: string | null;
  created_at?: string;
  request_date?: string;
  created_by?: string | null;
  profile?: WithdrawalRequestProfile;
  funds: WithdrawalRequestFund;
}

export interface ApproveWithdrawalParams {
  requestId: string;
  amount?: number;
  notes?: string;
}

export interface RejectWithdrawalParams {
  requestId: string;
  reason: string;
  notes?: string;
}

// ============================================================================
// Deposit Types (re-export from investor domain for convenience)
// ============================================================================

export interface DepositRequest {
  id: string;
  investor_id: string;
  fund_id?: string;
  amount: number;
  status: string;
  asset_symbol?: string;
  transaction_hash?: string;
  created_at: string;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
  funds?: {
    name: string;
    fund_class: string;
  };
}
