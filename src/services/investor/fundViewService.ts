/**
 * Fund View Service - Investor-facing fund queries
 *
 * ARCHITECTURE NOTE (P1 Consolidation 2026-01-19):
 * This service provides investor-facing fund queries with null-safe returns.
 * For admin operations that should throw on not-found, use:
 *   import { getFund, listFunds } from '@/services/admin/fundService'
 *
 * Key differences from admin/fundService:
 * - getFundById() returns null instead of throwing
 * - getAllFunds() filters to active funds only
 * - getActiveFundsForList() is equivalent to admin's getActiveFunds()
 */

import { supabase } from "@/integrations/supabase/client";
import type { Fund } from "@/types/domains/fund";
import { mapDbFundToFund } from "@/types/domains/fund";
import type { InvestorPosition } from "@/types/domains/investor";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";

// Note: Fund should be imported from @/types/domains/fund
// Note: InvestorPosition should be imported from @/types/domains/investor
// This service does NOT re-export these types to avoid duplication

/**
 * Extended InvestorPosition with nested fund data for queries
 */
export interface InvestorPositionWithFund extends InvestorPosition {
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
    .select(
      "id, code, name, fund_class, asset, status, inception_date, mgmt_fee_bps, perf_fee_bps, min_investment, high_water_mark, min_withdrawal_amount, lock_period_days, logo_url, strategy, cooling_off_hours, large_withdrawal_threshold, max_daily_yield_pct, created_at, updated_at"
    )
    .eq("status", "active")
    .order("asset", { ascending: true })
    .limit(100);

  if (error) {
    logError("fundView.getAllFunds", error);
    throw new Error(`Failed to fetch funds: ${error.message}`);
  }
  return (data || []).map(mapDbFundToFund);
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
    .order("asset", { ascending: true })
    .limit(100);

  if (error) {
    logError("fundView.getActiveFundsForList", error);
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
    .gt("current_value", 0)
    .limit(500);

  if (error) {
    logError("fundView.getActiveInvestorPositions", error);
    throw new Error(`Failed to fetch investor positions: ${error.message}`);
  }
  return data || [];
}

/**
 * Get fund by ID
 */
export async function getFundById(fundId: string): Promise<Fund | null> {
  try {
    const { data, error } = await supabase
      .from("funds")
      .select(
        "id, code, name, fund_class, asset, status, inception_date, mgmt_fee_bps, perf_fee_bps, min_investment, high_water_mark, min_withdrawal_amount, lock_period_days, logo_url, strategy, cooling_off_hours, large_withdrawal_threshold, max_daily_yield_pct, created_at, updated_at"
      )
      .eq("id", fundId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapDbFundToFund(data) : null;
  } catch (error) {
    logError("fundView.getFundById", error, { fundId });
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
  void investorId;
  void fundId;
  void initialInvestment;
  throw new Error(
    "Direct writes to investor_positions are disabled. A position is created/updated automatically via recompute triggers from transactions_v2."
  );
}

/**
 * Get investor positions by investor ID with nested fund data
 * Filters out zero-value positions (deleted or fully withdrawn)
 */
export async function getInvestorPositionsWithFunds(
  investorId: string
): Promise<InvestorPositionWithFund[]> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select(
      `
      investor_id,
      fund_id,
      fund_class,
      shares,
      cost_basis,
      current_value,
      unrealized_pnl,
      realized_pnl,
      last_transaction_date,
      aum_percentage,
      high_water_mark,
      mgmt_fees_paid,
      perf_fees_paid,
      cumulative_yield_earned,
      last_yield_crystallization_date,
      lock_until_date,
      updated_at,
      fund:funds!fk_investor_positions_fund (
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
    .order("current_value", { ascending: false })
    .limit(100);

  if (error) {
    logError("fundView.getInvestorPositions", error, { investorId });
    throw new Error(`Failed to fetch investor positions: ${error.message}`);
  }
  return (data as unknown as InvestorPositionWithFund[]) || [];
}

/**
 * Update investor position
 */
export async function updateInvestorPosition(
  investorId: string,
  fundId: string,
  updates: Partial<InvestorPosition>
): Promise<{ success: boolean; error?: string }> {
  void investorId;
  void fundId;
  void updates;
  throw new Error(
    "Direct updates to investor_positions are disabled. Positions are derived from SUM(transactions_v2) via recompute triggers."
  );
}

/**
 * Get investor's available funds (funds they don't have positions in)
 */
export async function getAvailableFundsForInvestor(investorId: string): Promise<Fund[]> {
  // Get all active funds
  const { data: allFunds, error: fundsError } = await supabase
    .from("funds")
    .select(
      "id, code, name, fund_class, asset, status, inception_date, mgmt_fee_bps, perf_fee_bps, min_investment, high_water_mark, min_withdrawal_amount, lock_period_days, logo_url, strategy, cooling_off_hours, large_withdrawal_threshold, max_daily_yield_pct, created_at, updated_at"
    )
    .eq("status", "active")
    .limit(100);

  if (fundsError) {
    logError("fundView.getAvailableFundsForInvestor.funds", fundsError, { investorId });
    throw new Error(`Failed to fetch available funds: ${fundsError.message}`);
  }

  // Get investor's current positions
  const { data: positions, error: positionsError } = await supabase
    .from("investor_positions")
    .select("fund_id")
    .eq("investor_id", investorId)
    .limit(100);

  if (positionsError) {
    logError("fundView.getAvailableFundsForInvestor.positions", positionsError, { investorId });
    throw new Error(`Failed to fetch investor positions: ${positionsError.message}`);
  }

  const existingFundIds = new Set(positions?.map((p) => p.fund_id) || []);

  // Filter out funds where investor already has positions and map to Fund type
  return (allFunds || []).filter((fund) => !existingFundIds.has(fund.id)).map(mapDbFundToFund);
}

/**
 * Remove fund from investor portfolio
 */
export async function removeFundFromInvestor(
  investorId: string,
  fundId: string
): Promise<{ success: boolean; error?: string }> {
  void investorId;
  void fundId;
  throw new Error(
    "Direct deletes from investor_positions are disabled. To remove a position, void or offset the underlying transactions in transactions_v2."
  );
}

/**
 * Get fund performance summary
 */
export async function getFundPerformanceSummary(fundId: string) {
  try {
    const { data: positions, error } = await supabase
      .from("investor_positions")
      .select("current_value, cost_basis, unrealized_pnl, realized_pnl")
      .eq("fund_id", fundId)
      .limit(500);

    if (error) throw error;

    const summary = {
      totalInvestors: positions?.length || 0,
      totalAUM:
        positions
          ?.reduce((sum, p) => sum.plus(parseFinancial(p.current_value)), parseFinancial(0))
          .toNumber() || 0,
      totalCostBasis:
        positions
          ?.reduce((sum, p) => sum.plus(parseFinancial(p.cost_basis)), parseFinancial(0))
          .toNumber() || 0,
      totalUnrealizedPnL:
        positions
          ?.reduce((sum, p) => sum.plus(parseFinancial(p.unrealized_pnl)), parseFinancial(0))
          .toNumber() || 0,
      totalRealizedPnL:
        positions
          ?.reduce((sum, p) => sum.plus(parseFinancial(p.realized_pnl)), parseFinancial(0))
          .toNumber() || 0,
    };

    return summary;
  } catch (error) {
    logError("fundView.getFundPerformanceSummary", error, { fundId });
    return {
      totalInvestors: 0,
      totalAUM: 0,
      totalCostBasis: 0,
      totalUnrealizedPnL: 0,
      totalRealizedPnL: 0,
    };
  }
}
