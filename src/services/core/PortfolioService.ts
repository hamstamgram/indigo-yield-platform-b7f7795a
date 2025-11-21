/**
 * Portfolio Service
 * Handles all portfolio-related operations
 */

import { ApiClient, ApiResponse } from "./ApiClient";
import type { PortfolioPosition, PortfolioSummary, PortfolioData } from "@/types/domains/portfolio";

export class PortfolioService extends ApiClient {
  /**
   * Get portfolio summary for investor
   */
  async getPortfolioSummary(investorId: string): Promise<ApiResponse<PortfolioSummary>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase.rpc("get_investor_portfolio_summary", {
        p_investor_id: investorId,
      });

      if (error) {
        return { data: null, error };
      }

      // Ensure proper structure even if RPC returns null or unexpected format
      if (data && typeof data === "object" && !Array.isArray(data) && "total_value" in data) {
        return { data: data as unknown as PortfolioSummary, error: null };
      }

      // Fallback to default structure
      const summary: PortfolioSummary = {
        total_value: 0,
        total_cost_basis: 0,
        total_unrealized_gain: 0,
        total_unrealized_gain_percent: 0,
        total_realized_gain: 0,
        position_count: 0,
        last_updated: new Date().toISOString(),
      };

      return { data: summary, error: null };
    });
  }

  /**
   * Get portfolio positions
   */
  async getPortfolioPositions(investorId: string): Promise<ApiResponse<PortfolioPosition[]>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from("investor_positions")
        .select(
          `
          *,
          funds:fund_id (
            name,
            code,
            asset,
            fund_class
          )
        `
        )
        .eq("investor_id", investorId);

      if (error) {
        return { data: null, error };
      }

      // Transform to PortfolioPosition format
      const positions: PortfolioPosition[] = (data || []).map((pos: any) => ({
        fund_id: pos.fund_id,
        fund_name: pos.funds?.name || "Unknown Fund",
        fund_class: pos.fund_class || pos.funds?.fund_class || "Standard",
        asset_code: pos.funds?.asset || "UNKNOWN",
        asset_name: pos.funds?.name || "Unknown",
        shares_held: Number(pos.shares) || 0,
        cost_basis: Number(pos.cost_basis) || 0,
        current_value: Number(pos.current_value) || 0,
        unrealized_gain: Number(pos.unrealized_pnl) || 0,
        unrealized_gain_percent:
          Number(pos.cost_basis) > 0
            ? ((Number(pos.unrealized_pnl) || 0) / Number(pos.cost_basis)) * 100
            : 0,
        percentage_of_portfolio: Number(pos.aum_percentage) || 0,
      }));

      return { data: positions, error: null };
    });
  }

  /**
   * Get complete portfolio data
   */
  async getCompletePortfolio(investorId: string): Promise<ApiResponse<PortfolioData>> {
    return this.execute(async () => {
      // Get summary
      const { data: summaryData, error: summaryError } = await this.supabase.rpc(
        "get_investor_portfolio_summary",
        { p_investor_id: investorId }
      );

      if (summaryError) {
        return { data: null, error: summaryError };
      }

      // Get positions
      const { data: positionsData, error: positionsError } = await this.supabase
        .from("investor_positions")
        .select(
          `
          *,
          funds:fund_id (
            name,
            code,
            asset,
            fund_class
          )
        `
        )
        .eq("investor_id", investorId);

      if (positionsError) {
        return { data: null, error: positionsError };
      }

      // Transform positions
      const positions: PortfolioPosition[] = (positionsData || []).map((pos: any) => ({
        fund_id: pos.fund_id,
        fund_name: pos.funds?.name || "Unknown Fund",
        fund_class: pos.fund_class || pos.funds?.fund_class || "Standard",
        asset_code: pos.funds?.asset || "UNKNOWN",
        asset_name: pos.funds?.name || "Unknown",
        shares_held: Number(pos.shares) || 0,
        cost_basis: Number(pos.cost_basis) || 0,
        current_value: Number(pos.current_value) || 0,
        unrealized_gain: Number(pos.unrealized_pnl) || 0,
        unrealized_gain_percent:
          Number(pos.cost_basis) > 0
            ? ((Number(pos.unrealized_pnl) || 0) / Number(pos.cost_basis)) * 100
            : 0,
        percentage_of_portfolio: Number(pos.aum_percentage) || 0,
      }));

      // Determine summary structure
      let summary: PortfolioSummary;
      if (
        summaryData &&
        typeof summaryData === "object" &&
        !Array.isArray(summaryData) &&
        "total_value" in summaryData
      ) {
        summary = summaryData as unknown as PortfolioSummary;
      } else {
        summary = {
          total_value: 0,
          total_cost_basis: 0,
          total_unrealized_gain: 0,
          total_unrealized_gain_percent: 0,
          total_realized_gain: 0,
          position_count: 0,
          last_updated: new Date().toISOString(),
        };
      }

      // Combine data
      const portfolioData: PortfolioData = {
        summary,
        positions,
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
      // Map application fields to database fields
      const dbUpdates: any = {
        ...(updates.shares_held !== undefined && { shares: updates.shares_held }),
        ...(updates.cost_basis !== undefined && { cost_basis: updates.cost_basis }),
        ...(updates.current_value !== undefined && { current_value: updates.current_value }),
        ...(updates.unrealized_gain !== undefined && { unrealized_pnl: updates.unrealized_gain }),
        ...(updates.fund_class !== undefined && { fund_class: updates.fund_class }),
      };

      const { data, error } = await this.supabase
        .from("investor_positions")
        .update(dbUpdates)
        .eq("investor_id", investorId)
        .eq("fund_id", fundId)
        .select(
          `
          *,
          funds:fund_id (
            name,
            code,
            asset,
            fund_class
          )
        `
        )
        .maybeSingle();

      if (error) {
        return { data: null, error };
      }

      if (!data) {
        return { data: null, error: { message: "Position not found", code: "NOT_FOUND" } as any };
      }

      // Transform to PortfolioPosition format
      const position: PortfolioPosition = {
        fund_id: data.fund_id,
        fund_name: data.funds?.name || "Unknown Fund",
        fund_class: data.fund_class || data.funds?.fund_class || "Standard",
        asset_code: data.funds?.asset || "UNKNOWN",
        asset_name: data.funds?.name || "Unknown",
        shares_held: Number(data.shares) || 0,
        cost_basis: Number(data.cost_basis) || 0,
        current_value: Number(data.current_value) || 0,
        unrealized_gain: Number(data.unrealized_pnl) || 0,
        unrealized_gain_percent:
          Number(data.cost_basis) > 0
            ? ((Number(data.unrealized_pnl) || 0) / Number(data.cost_basis)) * 100
            : 0,
        percentage_of_portfolio: Number(data.aum_percentage) || 0,
      };

      return { data: position, error: null };
    });
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService();
