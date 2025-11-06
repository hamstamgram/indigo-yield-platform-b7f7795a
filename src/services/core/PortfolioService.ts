/**
 * Portfolio Service
 * Handles all portfolio-related operations
 */

import { ApiClient, ApiResponse } from './ApiClient';
import type { PortfolioPosition, PortfolioSummary, PortfolioData } from '@/types/domains';

export class PortfolioService extends ApiClient {
  /**
   * Get portfolio summary for investor
   */
  async getPortfolioSummary(investorId: string): Promise<ApiResponse<PortfolioSummary>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .rpc('get_investor_portfolio_summary', { investor_id: investorId });

      return { data, error };
    });
  }

  /**
   * Get portfolio positions
   */
  async getPortfolioPositions(investorId: string): Promise<ApiResponse<PortfolioPosition[]>> {
    return this.execute(async () => {
      return await this.supabase
        .from('investor_positions')
        .select(`
          *,
          funds:fund_id (
            name,
            code,
            asset,
            fund_class
          )
        `)
        .eq('investor_id', investorId);
    });
  }

  /**
   * Get complete portfolio data
   */
  async getCompletePortfolio(investorId: string): Promise<ApiResponse<PortfolioData>> {
    return this.execute(async () => {
      // Get summary
      const { data: summary, error: summaryError } = await this.supabase
        .rpc('get_investor_portfolio_summary', { investor_id: investorId });

      if (summaryError) {
        return { data: null, error: summaryError };
      }

      // Get positions
      const { data: positions, error: positionsError } = await this.supabase
        .from('investor_positions')
        .select(`
          *,
          funds:fund_id (
            name,
            code,
            asset,
            fund_class
          )
        `)
        .eq('investor_id', investorId);

      if (positionsError) {
        return { data: null, error: positionsError };
      }

      // Combine data
      const portfolioData: PortfolioData = {
        summary: summary || {
          total_value: 0,
          total_cost_basis: 0,
          total_unrealized_gain: 0,
          total_unrealized_gain_percent: 0,
          total_realized_gain: 0,
          position_count: 0,
          last_updated: new Date().toISOString(),
        },
        positions: positions || [],
        allocation: [],
        performance: [],
      };

      return { data: portfolioData, error: null };
    });
  }

  /**
   * Update position
   */
  async updatePosition(
    investorId: string,
    fundId: string,
    updates: Partial<PortfolioPosition>
  ): Promise<ApiResponse<PortfolioPosition>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from('investor_positions')
        .update(updates)
        .eq('investor_id', investorId)
        .eq('fund_id', fundId)
        .select()
        .single();

      return { data, error };
    });
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService();
