/**
 * Investment Domain Types
 * Types for investment records and management
 */

export type InvestmentStatus = "pending" | "active" | "cancelled" | "rejected";
export type InvestmentTransactionType = "initial" | "additional" | "redemption";

export interface Investment {
  id: string;
  investor_id: string;
  fund_id: string;
  investment_date: string;
  /** Financial amount - string for NUMERIC(38,18) precision */
  amount: string;
  /** Share count - string for decimal precision */
  shares: string;
  status: InvestmentStatus;
  transaction_type: InvestmentTransactionType;
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
  /** Financial amount - string for NUMERIC(38,18) precision */
  amount: string;
  transaction_type: InvestmentTransactionType;
  /**
   * Authoritative AUM snapshot used for crystallize-before-flow accounting.
   * Required for deposits/withdrawals becoming effective.
   */
  /**
   * Timestamp for the effective flow event (defaults to investment_date at 00:00Z).
   */
  event_ts?: string;
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
