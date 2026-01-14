/**
 * Admin Fund Management Server Helpers
 * Client-side functions for fund operations
 */

import { supabase } from "@/integrations/supabase/client";
import type { Fund, FundRef } from "@/types/domains/fund";
import { mapDbFundToFund, mapFundToDb } from "@/types/domains/fund";

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
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbFundToFund);
}

/**
 * Get fund by ID
 */
export async function getFund(fundId: string): Promise<Fund> {
  const { data, error } = await supabase.from("funds").select("*").eq("id", fundId).maybeSingle();

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

  const { data, error } = await supabase
    .from("funds")
    .insert(dbRecord as any)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Failed to create fund");
  return mapDbFundToFund(data);
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
  const { data, error } = await supabase
    .from("funds")
    .insert({
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
    })
    .select()
    .single();

  if (error) throw error;
  return mapDbFundToFund(data);
}

/**
 * Update fund
 */
export async function updateFund(fundId: string, updates: Partial<Fund>): Promise<Fund> {
  // Convert to DB format (string financial fields -> numbers)
  const dbUpdates = mapFundToDb(updates);

  const { data, error } = await supabase
    .from("funds")
    .update(dbUpdates as any)
    .eq("id", fundId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Fund not found: ${fundId}`);
  return mapDbFundToFund(data);
}

// Deprecated functions listDailyNav and upsertDailyNav have been removed.
// Use Monthly Reports (investor_monthly_reports table) instead.

/**
 * Get fund KPIs
 * Note: total_aum is calculated from investor_positions.current_value
 */
export async function getFundKPIs() {
  // Get funds
  const { data: funds, error } = await supabase.from("funds").select("id, code, name, asset");
  if (error) throw error;

  // Get AUM per fund from investor_positions
  const { data: positions } = await supabase
    .from("investor_positions")
    .select("fund_id, current_value");

  // Calculate AUM per fund
  const fundAumMap: Record<string, number> = {};
  positions?.forEach((pos) => {
    if (!fundAumMap[pos.fund_id]) fundAumMap[pos.fund_id] = 0;
    fundAumMap[pos.fund_id] += Number(pos.current_value) || 0;
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

// Deprecated function calculateFundReturns has been removed.
// Use getFundKPIs() or getFundPerformance() instead.

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
    .eq("fund_id", fundId);

  const totalAum = positions?.reduce((sum, p) => sum + (Number(p.current_value) || 0), 0) || 0;

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
    .select("*")
    .eq("id", fundId)
    .maybeSingle();

  if (error) throw error;
  if (!fund) throw new Error(`Fund not found: ${fundId}`);

  // Calculate AUM from positions
  const { data: positions } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fundId);

  const totalAum = positions?.reduce((sum, p) => sum + (Number(p.current_value) || 0), 0) || 0;

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
    .order("name");

  if (error) throw error;
  return data || [];
}

/**
 * Get multiple funds by IDs
 */
export async function getFundsByIds(fundIds: string[]) {
  if (!fundIds.length) return [];

  const { data, error } = await supabase.from("funds").select("*").in("id", fundIds);

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
  const { error } = await supabase.from("funds").update({ status: "inactive" }).eq("id", fundId);

  if (error) throw error;
}

/**
 * Update fund status
 */
export async function updateFundStatus(fundId: string, status: string): Promise<Fund> {
  return updateFund(fundId, { status: status as Fund["status"] });
}
