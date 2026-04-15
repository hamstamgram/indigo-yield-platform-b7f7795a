/**
 * Investor Portfolio Service
 *
 * Handles investor portfolio data operations for investor-facing pages
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { parseFinancial } from "@/utils/financial";

export interface PortfolioPosition {
  investor_id: string;
  fund_id: string;
  shares: string;
  current_value: string;
  fund_class: string | null;
  fund: {
    id: string;
    name: string;
    code: string;
    asset: string;
  };
}

export interface WithdrawalFormPosition {
  fund_id: string;
  current_value: string;
  shares: string;
  fund_class: string | null;
  fund: {
    name: string;
    code: string;
    asset: string;
  };
}

export const investorPortfolioService = {
  /**
   * Get investor's portfolio positions with fund details
   */
  async getPortfolioPositions(investorId: string): Promise<PortfolioPosition[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        `
        investor_id,
        fund_id,
        shares,
        current_value,
        fund_class,
        funds:funds!fk_investor_positions_fund_id (
          id,
          name,
          code,
          asset
        )
      `
      )
      .eq("investor_id", investorId)
      .eq("is_active", true);

    if (error) throw error;

    return (data || []).map((pos: any) => ({
      investor_id: pos.investor_id,
      fund_id: pos.fund_id,
      shares: parseFinancial(pos.shares || 0).toString(),
      current_value: parseFinancial(pos.current_value || 0).toString(),
      fund_class: pos.fund_class,
      fund: pos.funds || { id: "", name: "Unknown", code: "UNK", asset: "N/A" },
    }));
  },

  /**
   * Get investor's positions for withdrawal form (positive value only)
   */
  async getWithdrawalFormPositions(investorId: string): Promise<WithdrawalFormPosition[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        `
        fund_id,
        current_value,
        shares,
        fund_class,
        funds:funds!fk_investor_positions_fund_id (
          name,
          code,
          asset
        )
      `
      )
      .eq("investor_id", investorId)
      .eq("is_active", true)
      .gt("current_value", 0);

    if (error) throw error;

    return (data || []).map((pos: any) => ({
      fund_id: pos.fund_id,
      current_value: parseFinancial(pos.current_value || 0).toString(),
      shares: parseFinancial(pos.shares || 0).toString(),
      fund_class: pos.fund_class,
      fund: pos.funds || { name: "Unknown", code: "UNK", asset: "N/A" },
    }));
  },

  /**
   * Get investor's withdrawals with fund details
   */
  async getWithdrawalsWithFunds(investorId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("withdrawal_requests")
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
      .eq("investor_id", investorId)
      .order("request_date", { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...item,
      request_date: item.request_date || new Date().toISOString(),
      funds: item.funds || {
        name: "Unknown Fund",
        code: "N/A",
        asset: "USDT",
        fund_class: "N/A",
      },
    }));
  },

  /**
   * Create withdrawal request — delegates to canonical withdrawalService
   * @deprecated Use withdrawalService.submitInvestorWithdrawal() directly
   */
  async createWithdrawalRequest(params: {
    investorId: string;
    fundId: string;
    amount: number;
    type: string;
    notes?: string;
  }): Promise<void> {
    // Import dynamically to avoid circular deps
    const { withdrawalService } = await import("@/features/shared/services/withdrawalService");
    await withdrawalService.submitInvestorWithdrawal({
      fundId: params.fundId,
      amount: String(params.amount), // Convert number to string for precision safety
      notes: params.notes,
    });
  },
};

export type { PortfolioPosition as PortfolioPositionType };
