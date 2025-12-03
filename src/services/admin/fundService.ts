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
  asset_symbol?: string;
  total_aum?: number;
  fund_class?: string;
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
    asset_symbol: fund.asset_symbol || fund.asset || "BTC", // Ensure asset_symbol is set
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
  const updatesWithSymbol = { ...updates };

  // Ensure asset_symbol is synchronized if asset is updated
  if (updates.asset && !updates.asset_symbol) {
    updatesWithSymbol.asset_symbol = updates.asset;
  }

  const { data, error } = await supabase
    .from("funds")
    .update(updatesWithSymbol)
    .eq("id", fundId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Fund not found: ${fundId}`);
  return data as Fund;
}

/**
 * List daily NAV for a fund
 * @deprecated Workflow moved to Monthly Reports
 */
export async function listDailyNav(_fundId: string, _startDate?: string, _endDate?: string) {
  console.warn("listDailyNav is deprecated. Use Monthly Reports.");
  return [] as DailyNav[];
}

/**
 * Upsert daily NAV data
 * @deprecated Workflow moved to Monthly Reports
 */
export async function upsertDailyNav(_rows: DailyNav[]) {
  console.warn("upsertDailyNav is deprecated. Use Monthly Reports.");
  return [] as DailyNav[];
}

/**
 * Get fund KPIs
 * Note: v_fund_kpis view might be deprecated. Using basic fund data instead.
 */
export async function getFundKPIs() {
  // Fallback to basic fund list if view doesn't exist or for new workflow
  const { data, error } = await supabase.from("funds").select("id, code, name, asset, total_aum");

  if (error) throw error;

  // Map funds to KPI structure
  return data.map((f) => ({
    fund_id: f.id,
    code: f.code,
    name: f.name,
    asset: f.asset,
    current_aum: f.total_aum || 0,
    day_return_pct: 0,
    mtd_return: 0,
    qtd_return: 0,
    ytd_return: 0,
    active_investors: 0, // Would need extra query, fine for now
  })) as FundKPI[];
}

/**
 * Calculate fund returns for a period
 * @deprecated
 */
export async function calculateFundReturns(
  _fundId: string,
  _startDate: string,
  _endDate: string,
  _net: boolean = true
) {
  return 0;
}

/**
 * Get latest NAV for a fund
 * Updated to use funds.total_aum
 */
export async function getLatestNav(fundId: string) {
  const { data, error } = await supabase
    .from("funds")
    .select("total_aum, updated_at")
    .eq("id", fundId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  // Adapt to DailyNav interface
  return {
    fund_id: fundId,
    nav_date: data.updated_at,
    aum: data.total_aum || 0,
    fees_accrued: 0,
    total_inflows: 0,
    total_outflows: 0,
    investor_count: 0,
    created_at: data.updated_at,
  } as DailyNav;
}

/**
 * Get fund performance summary
 * Updated to use funds table
 */
export async function getFundPerformance(fundId: string) {
  const { data: fund, error } = await supabase
    .from("funds")
    .select("*")
    .eq("id", fundId)
    .maybeSingle();

  if (error) throw error;
  if (!fund) throw new Error(`Fund not found: ${fundId}`);

  const kpi: FundKPI = {
    fund_id: fund.id,
    code: fund.code,
    name: fund.name,
    asset: fund.asset,
    current_aum: fund.total_aum || 0,
    day_return_pct: 0,
    mtd_return: 0,
    qtd_return: 0,
    ytd_return: 0,
    active_investors: 0,
  };

  return {
    kpi,
    history: [], // No daily history available in new workflow
  };
}
