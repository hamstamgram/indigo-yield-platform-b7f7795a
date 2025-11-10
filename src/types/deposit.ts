export type DepositStatus = "pending" | "verified" | "rejected";

export interface Deposit {
  id: string;
  user_id: string;
  asset_symbol: string;
  amount: number;
  status: DepositStatus;
  transaction_hash?: string;
  created_by?: string;
  created_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
}

export interface DepositFormData {
  user_id: string;
  asset_symbol: string;
  amount: number;
  transaction_hash?: string;
  status?: DepositStatus;
}

export interface DepositFilters {
  status?: DepositStatus;
  asset_symbol?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}
