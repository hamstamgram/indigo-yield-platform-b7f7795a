/**
 * Position Service
 * Handles investor_positions operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  fund_class: string;
  shares: number;
  cost_basis: number;
  current_value: number;
  aum_percentage?: number;
  high_water_mark?: number;
  last_transaction_date?: string;
  updated_at?: string;
}

export interface CreatePositionParams {
  investorId: string;
  fundId: string;
  fundClass?: string;
  shares: number;
  costBasis: number;
  currentValue: number;
}

class PositionService {
  /**
   * Get all positions
   */
  async getAllPositions(): Promise<InvestorPosition[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        "investor_id, fund_id, fund_class, shares, cost_basis, current_value, aum_percentage, high_water_mark, last_transaction_date, updated_at"
      )
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get positions for a specific fund
   */
  async getPositionsByFund(fundId: string): Promise<InvestorPosition[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        "investor_id, fund_id, fund_class, shares, cost_basis, current_value, aum_percentage, high_water_mark, last_transaction_date, updated_at"
      )
      .eq("fund_id", fundId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get position by investor and fund class
   */
  async getPositionByInvestorAndClass(investorId: string, fundClass: string): Promise<InvestorPosition | null> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        "investor_id, fund_id, fund_class, shares, cost_basis, current_value, aum_percentage, high_water_mark, last_transaction_date, updated_at"
      )
      .eq("investor_id", investorId)
      .eq("fund_class", fundClass)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Get positions for an investor (alias)
   */
  async getByInvestor(investorId: string): Promise<InvestorPosition[]> {
    return this.getPositionsByInvestor(investorId);
  }

  /**
   * Get positions for an investor
   */
  async getPositionsByInvestor(investorId: string): Promise<InvestorPosition[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        "investor_id, fund_id, fund_class, shares, cost_basis, current_value, aum_percentage, high_water_mark, last_transaction_date, updated_at"
      )
      .eq("investor_id", investorId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Direct writes to investor_positions are disabled.
   */
  async updatePosition(investorId: string, fundId: string, newValue: number): Promise<void> {
    throw new Error(
      "Direct investor_positions updates are disabled. Insert ledger rows into transactions_v2 and let triggers recompute balances."
    );
  }

  /**
   * Direct writes to investor_positions are disabled.
   */
  async createPosition(params: CreatePositionParams): Promise<InvestorPosition> {
    throw new Error(
      "Direct investor_positions inserts are disabled. Positions are derived from transactions_v2 and created automatically by recompute triggers."
    );
  }
}

export const positionService = new PositionService();
