/**
 * Fund Service - Enhanced fund management with investor allocation
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type FundStatus = Database["public"]["Enums"]["fund_status"];

export interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class: string;
  status: FundStatus | null;
  inception_date: string;
  mgmt_fee_bps: number | null;
  perf_fee_bps: number | null;
  min_investment: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  fund_class: string | null;
  shares: number;
  cost_basis: number;
  current_value: number;
  unrealized_pnl: number | null;
  realized_pnl: number | null;
  last_transaction_date: string | null;
  aum_percentage?: number | null;
  high_water_mark: number | null;
  lock_until_date: string | null;
  mgmt_fees_paid: number | null;
  perf_fees_paid: number | null;
  fund?: {
    id: string;
    code: string;
    name: string;
    asset: string;
    fund_class: string | null;
  };
}

/**
 * Get all active funds
 */
export async function getAllFunds(): Promise<Fund[]> {
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .eq("status", "active")
    .order("name");

  if (error) {
    console.error("Error fetching funds:", error);
    throw new Error(`Failed to fetch funds: ${error.message}`);
  }
  return data || [];
}

/**
 * Get active funds with minimal fields for dropdowns/lists
 */
export async function getActiveFundsForList(): Promise<
  { id: string; code: string; name: string; asset: string }[]
> {
  const { data, error } = await supabase
    .from("funds")
    .select("id, code, name, asset")
    .eq("status", "active")
    .order("code");

  if (error) {
    console.error("Error fetching active funds:", error);
    throw new Error(`Failed to fetch active funds: ${error.message}`);
  }
  return data || [];
}

/**
 * Get investor positions with fund IDs for filtering
 */
export async function getActiveInvestorPositions(): Promise<
  { investor_id: string; fund_id: string }[]
> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select("investor_id, fund_id")
    .gt("current_value", 0);

  if (error) {
    console.error("Error fetching investor positions:", error);
    throw new Error(`Failed to fetch investor positions: ${error.message}`);
  }
  return data || [];
}

/**
 * Get fund by ID
 */
export async function getFundById(fundId: string): Promise<Fund | null> {
  try {
    const { data, error } = await supabase.from("funds").select("*").eq("id", fundId).maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching fund:", error);
    return null;
  }
}

/**
 * Add fund to investor portfolio
 * Note: add_fund_to_investor RPC doesn't exist - use direct insert
 */
export async function addFundToInvestor(
  investorId: string,
  fundId: string,
  initialInvestment: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    // Insert directly into investor_positions
    const { error } = await supabase
      .from("investor_positions")
      .insert({
        investor_id: investorId,
        fund_id: fundId,
        cost_basis: initialInvestment,
        current_value: initialInvestment,
        shares: initialInvestment, // 1:1 share ratio initially
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error adding fund to investor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add fund",
    };
  }
}

/**
 * Get investor positions by investor ID
 * Filters out zero-value positions (deleted or fully withdrawn)
 */
export async function getInvestorPositions(investorId: string): Promise<InvestorPosition[]> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select(
      `
      *,
      fund:funds (
        id,
        code,
        name,
        asset,
        fund_class
      )
    `
    )
    .eq("investor_id", investorId)
    // Filter out zero-value positions
    .or("current_value.gt.0,cost_basis.gt.0,shares.gt.0")
    .order("current_value", { ascending: false });

  if (error) {
    console.error("Error fetching investor positions:", error);
    throw new Error(`Failed to fetch investor positions: ${error.message}`);
  }
  return data || [];
}

/**
 * Update investor position
 */
export async function updateInvestorPosition(
  investorId: string,
  fundId: string,
  updates: Partial<InvestorPosition>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("investor_positions")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("investor_id", investorId)
      .eq("fund_id", fundId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error updating investor position:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update position",
    };
  }
}

/**
 * Get investor's available funds (funds they don't have positions in)
 */
export async function getAvailableFundsForInvestor(investorId: string): Promise<Fund[]> {
  // Get all active funds
  const { data: allFunds, error: fundsError } = await supabase
    .from("funds")
    .select("*")
    .eq("status", "active");

  if (fundsError) {
    console.error("Error fetching funds:", fundsError);
    throw new Error(`Failed to fetch available funds: ${fundsError.message}`);
  }

  // Get investor's current positions
  const { data: positions, error: positionsError } = await supabase
    .from("investor_positions")
    .select("fund_id")
    .eq("investor_id", investorId);

  if (positionsError) {
    console.error("Error fetching positions:", positionsError);
    throw new Error(`Failed to fetch investor positions: ${positionsError.message}`);
  }

  const existingFundIds = new Set(positions?.map((p) => p.fund_id) || []);

  // Filter out funds where investor already has positions
  return (allFunds || []).filter((fund) => !existingFundIds.has(fund.id));
}

/**
 * Remove fund from investor portfolio
 */
export async function removeFundFromInvestor(
  investorId: string,
  fundId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("investor_positions")
      .delete()
      .eq("investor_id", investorId)
      .eq("fund_id", fundId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error removing fund from investor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove fund",
    };
  }
}

/**
 * Get fund performance summary
 */
export async function getFundPerformanceSummary(fundId: string) {
  try {
    const { data: positions, error } = await supabase
      .from("investor_positions")
      .select("*")
      .eq("fund_id", fundId);

    if (error) throw error;

    const summary = {
      totalInvestors: positions?.length || 0,
      totalAUM: positions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0,
      totalCostBasis: positions?.reduce((sum, p) => sum + (p.cost_basis || 0), 0) || 0,
      totalUnrealizedPnL: positions?.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0) || 0,
      totalRealizedPnL: positions?.reduce((sum, p) => sum + (p.realized_pnl || 0), 0) || 0,
    };

    return summary;
  } catch (error) {
    console.error("Error fetching fund performance:", error);
    return {
      totalInvestors: 0,
      totalAUM: 0,
      totalCostBasis: 0,
      totalUnrealizedPnL: 0,
      totalRealizedPnL: 0,
    };
  }
}
