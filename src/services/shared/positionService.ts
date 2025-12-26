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
  lock_until_date?: string;
  last_transaction_date?: string;
  created_at?: string;
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
      .select("*")
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
      .select("*")
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
      .select("*")
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
      .select("*")
      .eq("investor_id", investorId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update position value
   */
  async updatePosition(investorId: string, fundId: string, newValue: number): Promise<void> {
    const { error } = await supabase
      .from("investor_positions")
      .update({
        current_value: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq("investor_id", investorId)
      .eq("fund_id", fundId);

    if (error) throw error;
  }

  /**
   * Create a new position
   */
  async createPosition(params: CreatePositionParams): Promise<InvestorPosition> {
    const { data, error } = await supabase
      .from("investor_positions")
      .insert({
        investor_id: params.investorId,
        fund_id: params.fundId,
        fund_class: params.fundClass,
        shares: params.shares,
        cost_basis: params.costBasis,
        current_value: params.currentValue,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const positionService = new PositionService();
