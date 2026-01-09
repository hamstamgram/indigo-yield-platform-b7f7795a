/**
 * Position Service
 * Handles investor_positions operations
 */

import { supabase } from "@/integrations/supabase/client";
import { mapDbPositionToInvestorPosition, type InvestorPosition } from "@/types/domains/investor";

// Re-export type from canonical source for backward compatibility
export type { InvestorPosition } from "@/types/domains/investor";

export interface CreatePositionParams {
  investorId: string;
  fundId: string;
  fundClass?: string;
  shares: number;
  costBasis: number;
  currentValue: number;
}

const POSITION_SELECT = `
  investor_id, fund_id, fund_class, shares, cost_basis, current_value, 
  unrealized_pnl, realized_pnl, aum_percentage, high_water_mark, 
  mgmt_fees_paid, perf_fees_paid, last_transaction_date, 
  cumulative_yield_earned, last_yield_crystallization_date, lock_until_date, updated_at
`;

class PositionService {
  /**
   * Get all positions
   */
  async getAllPositions(): Promise<InvestorPosition[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(POSITION_SELECT)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapDbPositionToInvestorPosition);
  }

  /**
   * Get positions for a specific fund
   */
  async getPositionsByFund(fundId: string): Promise<InvestorPosition[]> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(POSITION_SELECT)
      .eq("fund_id", fundId);

    if (error) throw error;
    return (data || []).map(mapDbPositionToInvestorPosition);
  }

  /**
   * Get position by investor and fund class
   */
  async getPositionByInvestorAndClass(investorId: string, fundClass: string): Promise<InvestorPosition | null> {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(POSITION_SELECT)
      .eq("investor_id", investorId)
      .eq("fund_class", fundClass)
      .maybeSingle();

    if (error) throw error;
    return data ? mapDbPositionToInvestorPosition(data) : null;
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
      .select(POSITION_SELECT)
      .eq("investor_id", investorId);

    if (error) throw error;
    return (data || []).map(mapDbPositionToInvestorPosition);
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
