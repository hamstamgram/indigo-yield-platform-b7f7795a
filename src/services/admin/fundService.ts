/**
 * Admin Fund Management Server Helpers
 * Client-side functions for fund operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class?: string;
  strategy?: string;
  inception_date: string;
  status: "active" | "inactive" | "suspended";
  mgmt_fee_bps: number;
  perf_fee_bps: number;
  high_water_mark: number;
  min_investment: number;
  lock_period_days: number;
  created_at: string;
  updated_at: string;
}

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
export async function listFunds() {
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Fund[];
}

/**
 * Get fund by ID
 */
export async function getFund(fundId: string) {
  const { data, error } = await supabase.from("funds").select("*").eq("id", fundId).maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Fund not found: ${fundId}`);
  return data as Fund;
}

/**
 * Create new fund
 */
export async function createFund(fund: Omit<Fund, "id" | "created_at" | "updated_at">) {
  const fundWithDefaults = {
    ...fund,
    fund_class: fund.fund_class || "default",
    asset: fund.asset || "BTC",
  };

  const { data, error } = await supabase
    .from("funds")
    .insert(fundWithDefaults)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Failed to create fund");
  return data as Fund;
}

/**
 * Update fund
 */
export async function updateFund(fundId: string, updates: Partial<Fund>) {
  const { data, error } = await supabase
    .from("funds")
    .update(updates)
    .eq("id", fundId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Fund not found: ${fundId}`);
  return data as Fund;
}

/**
 * List daily NAV for a fund
 * @deprecated Workflow moved to Monthly Reports - Use investor_monthly_reports instead
 */
export async function listDailyNav(
  _fundId: string,
  _startDate?: string,
  _endDate?: string
): Promise<DailyNav[]> {
  throw new Error(
    "listDailyNav is deprecated. Use Monthly Reports (investor_monthly_reports table) instead."
  );
}

/**
 * Upsert daily NAV data
 * @deprecated Workflow moved to Monthly Reports - Use investor_monthly_reports instead
 */
export async function upsertDailyNav(_rows: DailyNav[]): Promise<DailyNav[]> {
  throw new Error(
    "upsertDailyNav is deprecated. Use Monthly Reports (investor_monthly_reports table) instead."
  );
}

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

/**
 * Calculate fund returns for a period
 * @deprecated Use getFundKPIs() for return calculations
 */
export async function calculateFundReturns(
  _fundId: string,
  _startDate: string,
  _endDate: string,
  _net: boolean = true
): Promise<number> {
  throw new Error(
    "calculateFundReturns is deprecated. Use getFundKPIs() or getFundPerformance() instead."
  );
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
