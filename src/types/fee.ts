export type FeeKind = 'management' | 'performance' | 'platform' | 'other';
export type FeeCalculationStatus = 'pending' | 'posted' | 'cancelled';

export interface FeeCalculation {
  id: string;
  calculation_date: string;
  investor_id: string;
  fund_id: string;
  fee_type: string;
  fee_amount: number;
  rate_bps: number;
  calculation_basis: number;
  status: FeeCalculationStatus;
  notes?: string;
  posted_transaction_id?: string;
  created_at: string;
  created_by?: string;
  // Joined data
  investor_name?: string;
  fund_name?: string;
  fund_code?: string;
}

export interface FundFeeStructure {
  fund_id: string;
  effective_from: string;
  mgmt_fee_bps: number;
  perf_fee_bps: number;
  created_at: string;
  created_by: string;
  // Joined data
  fund_name?: string;
  fund_code?: string;
}

export interface MonthlyFeeSummary {
  id: string;
  summary_month: string;
  asset_code: string;
  total_gross_yield: number;
  total_fees_collected: number;
  total_net_yield: number;
  investor_count: number;
  created_at: string;
}

export interface FeeStats {
  totalFeesThisMonth: number;
  totalFeesThisYear: number;
  pendingCalculations: number;
  averageFeeRate: number;
  topFeeGeneratingFund?: string;
}

export interface FeeFilters {
  status?: FeeCalculationStatus;
  fund_id?: string;
  investor_id?: string;
  date_from?: string;
  date_to?: string;
  fee_type?: string;
}
