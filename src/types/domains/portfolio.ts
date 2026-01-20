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
  /** Share count - string for NUMERIC precision */
  shares_held: string;
  /** Cost basis - string for NUMERIC(28,10) precision */
  cost_basis: string;
  /** Current value - string for NUMERIC(28,10) precision */
  current_value: string;
  /** Unrealized gain - string for NUMERIC(28,10) precision */
  unrealized_gain: string;
  /** Unrealized gain percent - string for decimal precision */
  unrealized_gain_percent: string;
  /** Portfolio allocation percentage - string for decimal precision */
  percentage_of_portfolio: string;
}

export interface PortfolioSummary {
  /** Total portfolio value - string for NUMERIC(28,10) precision */
  total_value: string;
  /** Total cost basis - string for NUMERIC(28,10) precision */
  total_cost_basis: string;
  /** Total unrealized gain - string for NUMERIC(28,10) precision */
  total_unrealized_gain: string;
  /** Total unrealized gain percent - string for decimal precision */
  total_unrealized_gain_percent: string;
  /** Total realized gain - string for NUMERIC(28,10) precision */
  total_realized_gain: string;
  position_count: number;
  last_updated: string;
}

export interface PortfolioAllocation {
  asset_code: AssetCode;
  asset_name: string;
  /** Allocation value - string for NUMERIC(28,10) precision */
  value: string;
  /** Allocation percentage - string for decimal precision */
  percentage: string;
  color: string;
}

export interface PortfolioPerformance {
  date: string;
  /** Portfolio value - string for NUMERIC(28,10) precision */
  value: string;
  /** Return amount - string for NUMERIC(28,10) precision */
  return_amount: string;
  /** Return percent - string for decimal precision */
  return_percent: string;
}

export interface PortfolioData {
  summary: PortfolioSummary;
  positions: PortfolioPosition[];
  allocation: PortfolioAllocation[];
  performance: PortfolioPerformance[];
}

export interface PerformanceMetrics {
  /** Month-to-date return - string for decimal precision */
  mtd_return: string;
  /** Quarter-to-date return - string for decimal precision */
  qtd_return: string;
  /** Year-to-date return - string for decimal precision */
  ytd_return: string;
  /** Inception-to-date return - string for decimal precision */
  itd_return: string;
  /** Sharpe ratio - string for decimal precision */
  sharpe_ratio?: string;
  /** Volatility - string for decimal precision */
  volatility?: string;
  /** Maximum drawdown - string for decimal precision */
  max_drawdown?: string;
  /** Total return - string for decimal precision */
  total_return?: string;
  /** Annualized return - string for decimal precision */
  annualized_return?: string;
}

// Performance record from investor_performance table
export interface PerformanceRecord {
  id: string;
  period_id: string;
  investor_id: string;
  fund_name: string;

  // Month-to-Date - strings for NUMERIC precision
  mtd_net_income: string;
  mtd_ending_balance: string;
  mtd_rate_of_return: string;

  // Quarter-to-Date - strings for NUMERIC precision
  qtd_net_income: string;
  qtd_ending_balance: string;
  qtd_rate_of_return: string;

  // Year-to-Date - strings for NUMERIC precision
  ytd_net_income: string;
  ytd_ending_balance: string;
  ytd_rate_of_return: string;

  // Inception-to-Date - strings for NUMERIC precision
  itd_net_income?: string;
  itd_ending_balance?: string;
  itd_rate_of_return?: string;

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
  /** Allocation value - string for NUMERIC(28,10) precision */
  value: string;
  /** Allocation percentage - string for decimal precision */
  percentage: string;
  color: string;
}
