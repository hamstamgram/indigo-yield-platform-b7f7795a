/**
 * Position Service
 * Handles investor_positions operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  fund_class?: string;
  shares: number;
  cost_basis: number;
  current_value: number;
}

class PositionService {
  /**
   * Create a new position
   */
  async createPosition(params: {
    investorId: string;
    fundId: string;
    fundClass?: string;
    shares: number;
    costBasis: number;
    currentValue: number;
  }): Promise<void> {
    const { error } = await supabase.from("investor_positions").insert({
      investor_id: params.investorId,
      fund_id: params.fundId,
      fund_class: params.fundClass,
      shares: params.shares,
      cost_basis: params.costBasis,
      current_value: params.currentValue,
    });

    if (error) throw error;
  }

  /**
   * Update position value
   */
  async updatePositionValue(
    investorId: string,
    fundId: string,
    currentValue: number
  ): Promise<void> {
    const { error } = await supabase
      .from("investor_positions")
      .update({
        current_value: currentValue,
        updated_at: new Date().toISOString(),
      })
      .eq("investor_id", investorId)
      .eq("fund_id", fundId);

    if (error) throw error;
  }

  /**
   * Get position for investor and fund
   */
  async getPosition(investorId: string, fundId: string): Promise<InvestorPosition | null> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select("*")
      .eq("investor_id", investorId)
      .eq("fund_id", fundId)
      .maybeSingle();

    if (error) throw error;
    return data as InvestorPosition | null;
  }

  /**
   * Get all positions for an investor
   */
  async getByInvestor(investorId: string): Promise<InvestorPosition[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select("*")
      .eq("investor_id", investorId);

    if (error) throw error;
    return (data || []) as InvestorPosition[];
  }

  /**
   * Find fund by asset symbol
   */
  async findFundByAsset(assetSymbol: string): Promise<{ id: string; fund_class: string } | null> {
    const { data, error } = await supabase
      .from("funds")
      .select("id, fund_class")
      .eq("asset", assetSymbol)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}

export const positionService = new PositionService();
