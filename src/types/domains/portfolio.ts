/**
 * Portfolio Domain Types
 * Clean abstractions for portfolio-related data
 */

import { Database } from "@/integrations/supabase/types";

type AssetCode = Database["public"]["Enums"]["asset_code"];

export interface PortfolioPosition {
  fund_id: string;
  fund_name: string;
  fund_class: string;
  asset_code: string;
  asset_name: string;
  shares_held: number;
  cost_basis: number;
  current_value: number;
  unrealized_gain: number;
  unrealized_gain_percent: number;
  percentage_of_portfolio: number;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost_basis: number;
  total_unrealized_gain: number;
  total_unrealized_gain_percent: number;
  total_realized_gain: number;
  position_count: number;
  last_updated: string;
}

export interface PortfolioAllocation {
  asset_code: AssetCode;
  asset_name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface PortfolioPerformance {
  date: string;
  value: number;
  return_amount: number;
  return_percent: number;
}

export interface PortfolioData {
  summary: PortfolioSummary;
  positions: PortfolioPosition[];
  allocation: PortfolioAllocation[];
  performance: PortfolioPerformance[];
}

export interface PerformanceMetrics {
  mtd_return: number;
  qtd_return: number;
  ytd_return: number;
  itd_return: number;
  sharpe_ratio?: number;
  volatility?: number;
  max_drawdown?: number;
  total_return?: number;
  annualized_return?: number;
}

// Performance record from investor_performance table
export interface PerformanceRecord {
  id: string;
  period_id: string;
  investor_id: string;
  fund_name: string;
  
  // Month-to-Date
  mtd_net_income: number;
  mtd_ending_balance: number;
  mtd_rate_of_return: number;
  
  // Quarter-to-Date
  qtd_net_income: number;
  qtd_ending_balance: number;
  qtd_rate_of_return: number;
  
  // Year-to-Date
  ytd_net_income: number;
  ytd_ending_balance: number;
  ytd_rate_of_return: number;
  
  // Inception-to-Date
  itd_net_income?: number;
  itd_ending_balance?: number;
  itd_rate_of_return?: number;

  // Joined Data
  period?: {
    period_name: string;
    period_end_date: string;
    year: number;
    month: number;
  };
}

export interface PerformanceFilters {
  userId: string;
  assetCode?: string;
  year?: number;
}

// Portfolio analytics types (from phase3Types)
export interface PortfolioAnalytics {
  user_id: string;
  fund_id?: string;
  period: "MTD" | "QTD" | "YTD" | "ITD";
  returns: number[];
  dates: string[];
  benchmark_returns?: number[];
  allocation: AllocationData[];
  performance_metrics: PerformanceMetrics;
}

export interface AllocationData {
  asset: string;
  value: number;
  percentage: number;
  color: string;
}
