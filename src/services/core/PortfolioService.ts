/**
 * Portfolio Service
 * Handles all portfolio-related operations
 */

import { ApiClient, ApiResponse } from "./ApiClient";
import type { PortfolioPosition, PortfolioSummary, PortfolioData } from "@/types/domains/portfolio";
import { supabase } from "@/integrations/supabase/client";

// Helper to fetch funds (internal use or imported)
async function getAllFunds() {
  const { data, error } = await supabase.from("funds").select("*");
  if (error) throw error;
  return data || [];
}

export class PortfolioService extends ApiClient {
  /**
   * Create investor positions and seed initial DEPOSIT transactions for each funded asset.
   * Balances are expected as native token amounts keyed by asset symbol (e.g., BTC, ETH).
   */
  async createPortfolioEntries(
    investorId: string,
    balances: Record<string, number>,
    _assets: any[]
  ): Promise<boolean> {
    try {
      const funds = await getAllFunds();
      const today = new Date().toISOString().split("T")[0];

      for (const [assetSymbolRaw, amountRaw] of Object.entries(balances || {})) {
        const amount = Number(amountRaw) || 0;
        if (amount <= 0) continue;

        const assetSymbol = assetSymbolRaw.toUpperCase();
        const fund = funds.find((f) => (f.asset || "").toUpperCase() === assetSymbol);
        if (!fund) {
          console.warn(`No fund found for asset ${assetSymbol}, skipping initial position.`);
          continue;
        }

        // Upsert investor position
        const { error: posError } = await supabase
          .from("investor_positions")
          .upsert(
            {
              investor_id: investorId,
              fund_id: fund.id,
              fund_class: fund.fund_class,
              shares: amount,
              cost_basis: amount,
              current_value: amount,
              last_transaction_date: today,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "investor_id,fund_id" }
          );
        if (posError) throw posError;

        // Seed a DEPOSIT transaction
        const { error: txError } = await supabase.from("transactions_v2").insert({
          investor_id: investorId,
          fund_id: fund.id,
          fund_class: fund.fund_class,
          asset: assetSymbol,
          amount,
          type: "DEPOSIT",
          tx_date: today,
          value_date: today,
          notes: "Initial funding on investor creation",
          balance_before: 0,
          balance_after: amount,
        });
        if (txError) throw txError;
      }

      return true;
    } catch (error) {
      console.error("createPortfolioEntries error", error);
      return false;
    }
  }

  /**
   * Get portfolio summary for investor
   * Note: get_investor_portfolio_summary RPC doesn't exist - calculate from positions
   */
  async getPortfolioSummary(investorId: string): Promise<ApiResponse<PortfolioSummary>> {
    return this.execute(async () => {
      // RPC doesn't exist - calculate summary from investor_positions directly
      const { data: positions, error } = await this.supabase
        .from("investor_positions")
        .select("cost_basis, current_value, unrealized_pnl, realized_pnl")
        .eq("investor_id", investorId);

      if (error) {
        return { data: null, error };
      }

      // Calculate summary from positions
      let totalValue = 0;
      let totalCostBasis = 0;
      let totalUnrealizedGain = 0;
      let totalRealizedGain = 0;

      for (const pos of positions || []) {
        totalValue += Number(pos.current_value) || 0;
        totalCostBasis += Number(pos.cost_basis) || 0;
        totalUnrealizedGain += Number(pos.unrealized_pnl) || 0;
        totalRealizedGain += Number(pos.realized_pnl) || 0;
      }

      const summary: PortfolioSummary = {
        total_value: totalValue,
        total_cost_basis: totalCostBasis,
        total_unrealized_gain: totalUnrealizedGain,
        total_unrealized_gain_percent: totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0,
        total_realized_gain: totalRealizedGain,
        position_count: positions?.length || 0,
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
        percentage_of_portfolio: 0, // aum_percentage column doesn't exist
      }));

      return { data: positions, error: null };
    });
  }

  /**
   * Get complete portfolio data
   * Note: get_investor_portfolio_summary RPC doesn't exist - calculate from positions
   */
  async getCompletePortfolio(investorId: string): Promise<ApiResponse<PortfolioData>> {
    return this.execute(async () => {
      // Get positions (also used for summary calculation)
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

      // Calculate summary from positions
      let totalValue = 0;
      let totalCostBasis = 0;
      let totalUnrealizedGain = 0;
      let totalRealizedGain = 0;

      for (const pos of positionsData || []) {
        totalValue += Number(pos.current_value) || 0;
        totalCostBasis += Number(pos.cost_basis) || 0;
        totalUnrealizedGain += Number(pos.unrealized_pnl) || 0;
        totalRealizedGain += Number(pos.realized_pnl) || 0;
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
        percentage_of_portfolio: 0, // aum_percentage column doesn't exist
      }));

      // Build summary
      const summary: PortfolioSummary = {
        total_value: totalValue,
        total_cost_basis: totalCostBasis,
        total_unrealized_gain: totalUnrealizedGain,
        total_unrealized_gain_percent: totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0,
        total_realized_gain: totalRealizedGain,
        position_count: positions.length,
        last_updated: new Date().toISOString(),
      };

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
        percentage_of_portfolio: 0, // aum_percentage column doesn't exist
      };

      return { data: position, error: null };
    });
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService();
