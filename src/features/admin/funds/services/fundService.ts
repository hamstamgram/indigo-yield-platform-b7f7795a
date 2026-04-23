/**
 * Admin Fund Management Server Helpers
 * Client-side functions for fund operations
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { db } from "@/lib/db/index";
import type { Fund, FundRef } from "@/types/domains/fund";
import { mapDbFundToFund, mapFundToDb } from "@/types/domains/fund";
import { parseFinancial } from "@/utils/financial";

// Import types from canonical source - do NOT re-export to avoid duplication
// Consumers should import Fund, FundRef from @/types/domains/fund

export interface DailyNav {
  fund_id: string;
  nav_date: string;
  aum: string;
  nav_per_share?: number;
  shares_outstanding?: number;
  gross_return_pct?: number;
  net_return_pct?: number;
  fees_accrued: number;
  high_water_mark?: string;
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
  current_aum?: string;
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

  if (result.error) throw new Error(result.error.message || result.error.userMessage);
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
    mgmt_fee_bps: 0,
    perf_fee_bps: 2000,
    min_investment: 0,
  });

  if (result.error) throw new Error(result.error.message || result.error.userMessage);
  if (!result.data) throw new Error("Failed to create fund");
  return mapDbFundToFund(result.data);
}

/**
 * Update fund
 */
export async function updateFund(fundId: string, updates: Partial<Fund>): Promise<Fund> {
  const dbUpdates = mapFundToDb(updates);

  const result = await db.update("funds", dbUpdates as any, { column: "id", value: fundId });

  if (result.error) throw new Error(result.error.message || result.error.userMessage);
  if (!result.data || result.data.length === 0) throw new Error(`Fund not found: ${fundId}`);
  return mapDbFundToFund(result.data[0]);
}

/**
 * Get fund KPIs from authoritative server-side summary
 * Eliminates client-side position aggregation bottleneck
 */
export async function getFundKPIs(): Promise<FundKPI[]> {
  const { data, error } = await rpc.callNoArgs("get_active_funds_summary");

  if (error) {
    throw new Error(`Failed to fetch fund KPIs: ${error.message}`);
  }

  const results = (data || []) as any[];

  return results.map((f) => ({
    fund_id: f.id,
    code: f.code,
    name: f.name,
    asset: f.asset,
    current_aum: parseFinancial(f.total_aum || 0).toString(),
    day_return_pct: 0,
    mtd_return: 0,
    qtd_return: 0,
    ytd_return: 0,
    itd_return: 0,
    active_investors: f.investor_count || 0,
  })) as FundKPI[];
}

/**
 * Get latest NAV for a fund
 * Authoritative AUM from server-side snapshot
 */
export async function getLatestNav(fundId: string) {
  const { data, error } = await rpc.call("get_fund_aum_as_of", {
    p_fund_id: fundId,
    p_as_of_date: new Date().toISOString().split("T")[0],
  });

  if (error) throw error;
  if (!data) return null;

  const result = data as any;

  // Adapt to DailyNav interface
  return {
    fund_id: fundId,
    nav_date: new Date().toISOString(),
    aum: parseFinancial(result.aum_value || 0).toString(),
    fees_accrued: 0,
    total_inflows: 0,
    total_outflows: 0,
    investor_count: result.investor_count || 0,
    created_at: new Date().toISOString(),
  } as DailyNav;
}

/**
 * Get fund performance summary
 * Uses server-side aggregation for scalability
 */
export async function getFundPerformance(fundId: string) {
  const { data, error } = await rpc.call("get_fund_aum_as_of", {
    p_fund_id: fundId,
    p_as_of_date: new Date().toISOString().split("T")[0],
  });

  if (error) throw error;
  if (!data) throw new Error(`Fund not found: ${fundId}`);

  const result = data as any;

  const kpi: FundKPI = {
    fund_id: fundId,
    code: result.fund_code || "Unknown",
    name: result.fund_name || "Unknown",
    asset: result.asset || "Unknown",
    current_aum: parseFinancial(result.aum_value || 0).toString(),
    day_return_pct: 0,
    mtd_return: 0,
    qtd_return: 0,
    ytd_return: 0,
    active_investors: result.investor_count || 0,
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

  if (result.error) throw new Error(result.error.message || result.error.userMessage);
}

/**
 * Update fund status
 */
export async function updateFundStatus(fundId: string, status: string): Promise<Fund> {
  return updateFund(fundId, { status: status as Fund["status"] });
}

/**
 * Delete a fund (hard delete from funds table)
 * Uses the hardened purge_fund_hard RPC to handle all 17+ dependencies atomically.
 */
export async function deleteFund(
  fundId: string
): Promise<{ success: boolean; purged_fund?: string }> {
  const { data, error } = await rpc.call("purge_fund_hard", {
    p_fund_id: fundId,
  });

  if (error) {
    throw new Error(`Failed to delete fund: ${error.message}`);
  }

  const result = data as { success: boolean; purged_fund?: string; error?: string };

  if (!result.success) {
    throw new Error(result.error || "Failed to delete fund");
  }

  return result;
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
