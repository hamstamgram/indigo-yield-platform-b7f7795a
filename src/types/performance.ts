/**
 * Performance Types
 * Definitions for investor fund performance metrics
 */

export interface PerformanceRecord {
  id: string;
  period_id: string;
  user_id: string;
  fund_name: string; // 'BTC', 'ETH', 'SOL', etc.
  
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
  
  // Inception-to-Date (Optional, but good to have)
  itd_net_income?: number;
  itd_ending_balance?: number;
  itd_rate_of_return?: number;

  // Joined Data
  period?: {
    period_name: string; // "October 2024"
    period_end_date: string; // "2024-10-31"
    year: number;
    month: number;
  };
}

export interface PerformanceFilters {
  userId: string;
  assetCode?: string;
  year?: number;
}
