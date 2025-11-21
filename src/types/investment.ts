export type InvestmentStatus = "pending" | "active" | "cancelled" | "rejected";
export type TransactionType = "initial" | "additional" | "redemption";

export interface Investment {
  id: string;
  investor_id: string;
  fund_id: string;
  investment_date: string;
  amount: number;
  shares: number;
  status: InvestmentStatus;
  transaction_type: TransactionType;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  processed_by?: string;
  processed_at?: string;
  metadata?: Record<string, any>;
  // Joined data
  investor_name?: string;
  investor_email?: string;
  fund_name?: string;
  fund_code?: string;
}

export interface InvestmentFormData {
  investor_id: string;
  fund_id: string;
  investment_date: string;
  amount: number;
  transaction_type: TransactionType;
  reference_number?: string;
  notes?: string;
}

export interface InvestmentFilters {
  status?: InvestmentStatus;
  fund_id?: string;
  investor_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
