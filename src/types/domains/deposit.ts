/**
 * Deposit Domain Types
 * Types for deposit transactions and management
 */

export type DepositStatus = "pending" | "verified" | "rejected" | "completed" | "failed";

export interface Deposit {
  id: string;
  user_id?: string;
  investor_id?: string;
  asset_symbol: string;
  /** Financial amount - string for NUMERIC(28,10) precision */
  amount: string;
  status: DepositStatus;
  transaction_hash?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  // Joined data
  user_email?: string;
  user_name?: string;
}

export interface DepositFormData {
  user_id: string;
  asset_symbol: string;
  /** Financial amount - string for NUMERIC(28,10) precision */
  amount: string;
  /**
   * Authoritative AUM snapshot used for crystallize-before-flow accounting.
   * Must be provided for any deposit that becomes effective.
   */
  /**
   * Timestamp for the effective flow event (defaults to now).
   */
  event_ts?: string;
  transaction_hash?: string;
  status?: DepositStatus;
  tx_date?: string;
}

export interface DepositFilters {
  status?: DepositStatus;
  asset_symbol?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}
