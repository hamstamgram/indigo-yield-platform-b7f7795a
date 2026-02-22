/**
 * Admin Fund Management Server Helpers
 * Client-side functions for fund operations
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";
import type { Fund, FundRef } from "@/types/domains/fund";
import { mapDbFundToFund, mapFundToDb } from "@/types/domains/fund";
import { parseFinancial } from "@/utils/financial";

// Import types from canonical source - do NOT re-export to avoid duplication
// Consumers should import Fund, FundRef from @/types/domains/fund

export interface DailyNav {
  fund_id: string;
  nav_date: string;
  aum: number;
  nav_per_share?: number;
  shares_outstanding?: number;
  gross_return_pct?: number;
  net_return_pct?: number;
  fees_accrued: number;
  high_water_mark?: number;
  total_inflows: number;
  total_outflows: number;
  investor_count: number;
  created_at: string;
}

export interface FundKPI {
  fund_id: string;
  code: string;
  name: string;
  asset: string;
  day_return_pct?: number;
  mtd_return: number;
  qtd_return: number;
  ytd_return: number;
  itd_return?: number;
  current_aum?: number;
  active_investors: number;
}

/**
 * List all funds
 */
export async function listFunds(): Promise<Fund[]> {
  const { data, error } = await supabase
    .from("funds")
    .select(
      "id, code, name, fund_class, asset, status, inception_date, mgmt_fee_bps, perf_fee_bps, min_investment, high_water_mark, min_withdrawal_amount, lock_period_days, logo_url, strategy, cooling_off_hours, large_withdrawal_threshold, max_daily_yield_pct, created_at, updated_at"
    )
    .order("asset", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapDbFundToFund);
}

/**
 * Get fund by ID
 */
export async function getFund(fundId: string): Promise<Fund> {
  const { data, error } = await supabase
    .from("funds")
    .select(
      "id, code, name, fund_class, asset, status, inception_date, mgmt_fee_bps, perf_fee_bps, min_investment, high_water_mark, min_withdrawal_amount, lock_period_days, logo_url, strategy, cooling_off_hours, large_withdrawal_threshold, max_daily_yield_pct, created_at, updated_at"
    )
    .eq("id", fundId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Fund not found: ${fundId}`);
  return mapDbFundToFund(data);
}

/**
 * Create new fund from full Fund data
 */
export async function createFund(
  fund: Omit<Fund, "id" | "created_at" | "updated_at">
): Promise<Fund> {
  // Convert to DB format (string financial fields -> numbers)
  const dbRecord = mapFundToDb(fund);

  const result = await db.insert("funds", dbRecord as any);

  if (result.error) throw new Error(result.error.userMessage);
  if (!result.data) throw new Error("Failed to create fund");
  return mapDbFundToFund(result.data);
}

/**
 * Create fund with minimal input (for wizard/quick creation)
 * Fills in sensible defaults for required fields
 */
export interface CreateFundInput {
  code: string;
  name: string;
  asset: string;
  inception_date: string;
  logo_url?: string | null;
}

export async function createFundSimple(input: CreateFundInput): Promise<Fund> {
  const result = await db.insert("funds", {
    code: input.code,
    name: input.name,
    asset: input.asset,
    fund_class: input.asset,
    inception_date: input.inception_date,
    status: "active",
    logo_url: input.logo_url || null,
    mgmt_fee_bps: 0, // CFO Policy: No management fees - frozen at DB level
    perf_fee_bps: 2000,
    min_investment: 0,
  });

  if (result.error) throw new Error(result.error.userMessage);
  if (!result.data) throw new Error("Failed to create fund");
  return mapDbFundToFund(result.data);
}

/**
 * Update fund
 */
export async function updateFund(fundId: string, updates: Partial<Fund>): Promise<Fund> {
  // Convert to DB format (string financial fields -> numbers)
  const dbUpdates = mapFundToDb(updates);

  const result = await db.update("funds", dbUpdates as any, { column: "id", value: fundId });

  if (result.error) throw new Error(result.error.userMessage);
  if (!result.data || result.data.length === 0) throw new Error(`Fund not found: ${fundId}`);
  return mapDbFundToFund(result.data[0]);
}

/**
 * Get fund KPIs
 * Note: total_aum is calculated from investor_positions.current_value
 */
export async function getFundKPIs() {
  // Get funds
  const { data: funds, error } = await supabase
    .from("funds")
    .select("id, code, name, asset")
    .limit(100);
  if (error) throw error;

  // Get AUM per fund from investor_positions
  const { data: positions } = await supabase
    .from("investor_positions")
    .select("fund_id, current_value")
    .limit(500);

  // Calculate AUM per fund
  const fundAumMap: Record<string, number> = {};
  positions?.forEach((pos) => {
    if (!fundAumMap[pos.fund_id]) fundAumMap[pos.fund_id] = 0;
    fundAumMap[pos.fund_id] = parseFinancial(fundAumMap[pos.fund_id])
      .plus(parseFinancial(pos.current_value))
      .toNumber();
  });

  // Map funds to KPI structure
  return funds.map((f) => ({
    fund_id: f.id,
    code: f.code,
    name: f.name,
    asset: f.asset,
    current_aum: fundAumMap[f.id] || 0,
    day_return_pct: 0,
    mtd_return: 0,
    qtd_return: 0,
    ytd_return: 0,
    active_investors: 0,
  })) as FundKPI[];
}

/**
 * Get latest NAV for a fund
 * Calculates AUM from investor_positions
 */
export async function getLatestNav(fundId: string) {
  // Get fund updated_at
  const { data: fund, error } = await supabase
    .from("funds")
    .select("updated_at")
    .eq("id", fundId)
    .maybeSingle();

  if (error) throw error;
  if (!fund) return null;

  // Calculate AUM from positions
  const { data: positions } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fundId)
    .limit(500);

  const totalAum =
    positions
      ?.reduce((sum, p) => sum.plus(parseFinancial(p.current_value)), parseFinancial(0))
      .toNumber() || 0;

  // Adapt to DailyNav interface
  return {
    fund_id: fundId,
    nav_date: fund.updated_at,
    aum: totalAum,
    fees_accrued: 0,
    total_inflows: 0,
    total_outflows: 0,
    investor_count: positions?.length || 0,
    created_at: fund.updated_at,
  } as DailyNav;
}

/**
 * Get fund performance summary
 * Calculates AUM from investor_positions
 */
export async function getFundPerformance(fundId: string) {
  const { data: fund, error } = await supabase
    .from("funds")
    .select("id, code, name, asset")
    .eq("id", fundId)
    .maybeSingle();

  if (error) throw error;
  if (!fund) throw new Error(`Fund not found: ${fundId}`);

  // Calculate AUM from positions
  const { data: positions } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fundId)
    .limit(500);

  const totalAum =
    positions
      ?.reduce((sum, p) => sum.plus(parseFinancial(p.current_value)), parseFinancial(0))
      .toNumber() || 0;

  const kpi: FundKPI = {
    fund_id: fund.id,
    code: fund.code,
    name: fund.name,
    asset: fund.asset,
    current_aum: totalAum,
    day_return_pct: 0,
    mtd_return: 0,
    qtd_return: 0,
    ytd_return: 0,
    active_investors: positions?.length || 0,
  };

  return {
    kpi,
    history: [],
  };
}

/**
 * Check fund usage (positions and transactions count)
 * Used to determine if ticker change should be blocked
 */
export async function checkFundUsage(
  fundId: string
): Promise<{ positions: number; transactions: number }> {
  const [positionsResult, transactionsResult] = await Promise.all([
    supabase
      .from("investor_positions")
      .select("id", { count: "exact", head: true })
      .eq("fund_id", fundId),
    supabase
      .from("transactions_v2")
      .select("id", { count: "exact", head: true })
      .eq("fund_id", fundId),
  ]);

  return {
    positions: positionsResult.count || 0,
    transactions: transactionsResult.count || 0,
  };
}

// ============= Methods migrated from shared/fundService.ts =============

/**
 * Get active funds (minimal fields for dropdowns)
 */
export async function getActiveFunds(): Promise<
  Array<{ id: string; code: string; name: string; asset: string }>
> {
  const { data, error } = await supabase
    .from("funds")
    .select("id, code, name, asset")
    .eq("status", "active")
    .order("asset", { ascending: true })
    .limit(100);

  if (error) throw error;
  return data || [];
}

/**
 * Get multiple funds by IDs
 */
export async function getFundsByIds(fundIds: string[]) {
  if (!fundIds.length) return [];

  const { data, error } = await supabase
    .from("funds")
    .select("id, code, name, asset")
    .in("id", fundIds)
    .limit(100);

  if (error) throw error;
  return data || [];
}

/**
 * Get fund by asset symbol
 */
export async function getFundByAsset(asset: string) {
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .eq("asset", asset)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Check if fund code exists
 */
export async function codeExists(code: string): Promise<boolean> {
  const { data } = await supabase.from("funds").select("id").eq("code", code).maybeSingle();
  return !!data;
}

/**
 * Deactivate fund (set status to inactive)
 */
export async function deactivateFund(fundId: string): Promise<void> {
  const result = await db.update("funds", { status: "inactive" }, { column: "id", value: fundId });

  if (result.error) throw new Error(result.error.userMessage);
}

/**
 * Update fund status
 */
export async function updateFundStatus(fundId: string, status: string): Promise<Fund> {
  return updateFund(fundId, { status: status as Fund["status"] });
}

/**
 * Delete a fund (hard delete from funds table)
 * Requires: zero active investor positions
 * Returns usage counts so caller can warn about historical data removal
 */
export async function deleteFund(
  fundId: string
): Promise<{ positions: number; transactions: number }> {
  // Pre-check: count active positions and historical transactions
  const usage = await checkFundUsage(fundId);

  if (usage.positions > 0) {
    throw new Error(
      `Cannot delete fund with ${usage.positions} active investor position(s). Transfer or withdraw their positions first.`
    );
  }

  // Delete related records that reference this fund (cascade)
  // Order matters: delete children before parent

  // Delete yield-related allocations via their distributions
  const { data: distributions } = await supabase
    .from("yield_distributions")
    .select("id")
    .eq("fund_id", fundId);

  if (distributions && distributions.length > 0) {
    const distIds = distributions.map((d) => d.id);

    await supabase.from("yield_allocations").delete().in("distribution_id", distIds);
    await supabase.from("fee_allocations").delete().in("distribution_id", distIds);
    await supabase.from("ib_allocations").delete().in("distribution_id", distIds);
    await supabase.from("yield_distributions").delete().eq("fund_id", fundId);
  }

  // Delete transactions referencing this fund
  await supabase.from("transactions_v2").delete().eq("fund_id", fundId);

  // Delete investor positions (should be 0 but clean up any stale rows)
  await supabase.from("investor_positions").delete().eq("fund_id", fundId);

  // Delete AUM snapshots
  await supabase.from("fund_daily_aum").delete().eq("fund_id", fundId);

  // Delete the fund itself
  const { error } = await supabase.from("funds").delete().eq("id", fundId);

  if (error) throw new Error(`Failed to delete fund: ${error.message}`);

  return usage;
}

// Plain object singleton for fundService.method() pattern
export const fundService = {
  getAllFunds: listFunds,
  getFundById: getFund,
  updateFund,
  updateFundStatus,
  getFundKPIs,
  getLatestNav,
  getFundPerformance,
  getActiveFunds,
  getFundsByIds,
  getFundByAsset,
  codeExists,
  createFund: createFundSimple,
  deactivateFund,
  deleteFund,
  checkFundUsage,
};
