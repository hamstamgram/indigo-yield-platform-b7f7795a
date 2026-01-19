/**
 * Portfolio Service
 * Handles all portfolio-related operations
 *
 * IMPORTANT: Money movements must use crystallize-before-flow RPCs.
 */

import { ApiClient, ApiResponse } from "./ApiClient";
import type { PortfolioPosition, PortfolioSummary, PortfolioData } from "@/types/domains/portfolio";
import { supabase } from "@/integrations/supabase/client";
import { logError, logWarn } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";

// Helper to fetch funds (internal use)
async function getAllFunds() {
  const { data, error } = await supabase.from("funds").select("*");
  if (error) throw error;
  return data || [];
}

export class PortfolioService extends ApiClient {
  /**
   * Create investor positions and seed initial DEPOSIT transactions for each funded asset.
   * Uses apply_deposit_with_crystallization so yield is crystallized (if applicable) before the flow.
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
          logWarn("createPortfolioEntries.noFund", { assetSymbol });
          continue;
        }

        // Best-effort closing AUM snapshot (authoritative snapshots should be provided by admin flows).
        // Use post_flow_aum if available for accurate opening AUM
        const { data: lastEvent } = await (supabase as any)
          .from("fund_aum_events")
          .select("closing_aum, post_flow_aum, event_ts")
          .eq("fund_id", fund.id)
          .eq("is_voided", false)
          .order("event_ts", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Use post_flow_aum if available, otherwise closing_aum
        const closingAum = lastEvent?.post_flow_aum
          ? String(lastEvent.post_flow_aum)
          : lastEvent?.closing_aum
            ? String(lastEvent.closing_aum)
            : "0.0000000000";

        // Generate trigger reference for idempotency
        const triggerReference = `initial:${fund.id}:${investorId}:${today}:${crypto.randomUUID()}`;
        const newTotalAum = Number(closingAum) + amount;

        const { data, error } = await callRPC("apply_deposit_with_crystallization", {
          p_fund_id: fund.id,
          p_investor_id: investorId,
          p_amount: amount,
          p_closing_aum: newTotalAum,
          p_effective_date: today,
          p_admin_id: investorId,
          p_notes: `Initial position - ${triggerReference}`,
          p_purpose: "transaction",
        });

        if (error) {
          logError("createPortfolioEntries.deposit", error, { assetSymbol, fundId: fund.id });
          throw error;
        }

        const result = data as any;
        if (!result?.success) {
          throw new Error(`Failed to create position for ${assetSymbol}`);
        }
      }

      return true;
    } catch (error) {
      logError("createPortfolioEntries", error, { investorId });
      return false;
    }
  }

  /**
   * Get portfolio summary for investor
   */
  async getPortfolioSummary(investorId: string): Promise<ApiResponse<PortfolioSummary>> {
    return this.execute(async () => {
      const { data: positions, error } = await this.supabase
        .from("investor_positions")
        .select("cost_basis, current_value, unrealized_pnl, realized_pnl")
        .eq("investor_id", investorId)
        .or("current_value.gt.0,cost_basis.gt.0,shares.gt.0");

      if (error) {
        return { data: null, error };
      }

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
        total_unrealized_gain_percent:
          totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0,
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
          funds!fk_investor_positions_fund (
            name,
            code,
            asset,
            fund_class
          )
        `
        )
        .eq("investor_id", investorId)
        .or("current_value.gt.0,cost_basis.gt.0,shares.gt.0");

      if (error) {
        return { data: null, error };
      }

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
      const { data: positionsData, error: positionsError } = await this.supabase
        .from("investor_positions")
        .select(
          `
          *,
          funds!fk_investor_positions_fund (
            name,
            code,
            asset,
            fund_class
          )
        `
        )
        .eq("investor_id", investorId)
        .or("current_value.gt.0,cost_basis.gt.0,shares.gt.0");

      if (positionsError) {
        return { data: null, error: positionsError };
      }

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

      const summary: PortfolioSummary = {
        total_value: totalValue,
        total_cost_basis: totalCostBasis,
        total_unrealized_gain: totalUnrealizedGain,
        total_unrealized_gain_percent:
          totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0,
        total_realized_gain: totalRealizedGain,
        position_count: positions.length,
        last_updated: new Date().toISOString(),
      };

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
   * Update position - for admin manual adjustments only
   * Note: Direct position writes are disabled. Use the ledger (transactions_v2) and recompute triggers.
   */
  async updatePosition(
    investorId: string,
    fundId: string,
    updates: Partial<PortfolioPosition>
  ): Promise<ApiResponse<PortfolioPosition>> {
    return this.execute(async () => {
      void investorId;
      void fundId;
      void updates;
      return {
        data: null,
        error: {
          message:
            "Direct updates to investor_positions are disabled. Positions are derived from SUM(transactions_v2) via recompute triggers.",
        } as any,
      };
    });
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService();
