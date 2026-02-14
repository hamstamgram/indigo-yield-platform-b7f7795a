/**
 * Investor Yield Service
 * Investor-facing yield queries (only shows investor_visible events)
 */

import { supabase } from "@/integrations/supabase/client";
import { formatDateForDB } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";

export interface InvestorYieldEvent {
  id: string;
  investor_id: string;
  fund_id: string;
  event_date: string;
  trigger_type: string;
  investor_balance: number;
  investor_share_pct: number;
  fund_yield_pct: number;
  gross_yield_amount: number;
  fee_pct: number;
  fee_amount: number;
  net_yield_amount: number;
  period_start: string;
  period_end: string;
  days_in_period: number;
  made_visible_at: string | null;
  created_at: string;
  fund?: {
    name: string;
    asset: string;
    code: string;
  };
}

export interface InvestorYieldSummary {
  fundId: string;
  fundName: string;
  fundAsset: string;
  totalGrossYield: number;
  totalFees: number;
  totalNetYield: number;
  eventCount: number;
}

/**
 * Get visible yield events for an investor
 * Only returns events with visibility_scope = 'investor_visible'
 */
export async function getInvestorVisibleYield(
  investorId: string,
  options?: {
    year?: number;
    month?: number;
    fundId?: string;
    limit?: number;
  }
): Promise<InvestorYieldEvent[]> {
  let query = supabase
    .from("investor_yield_events")
    .select(
      `
      id,
      investor_id,
      fund_id,
      event_date,
      trigger_type,
      investor_balance,
      investor_share_pct,
      fund_yield_pct,
      gross_yield_amount,
      fee_pct,
      fee_amount,
      net_yield_amount,
      period_start,
      period_end,
      days_in_period,
      made_visible_at,
      created_at,
      fund:funds(name, asset, code)
    `
    )
    .eq("investor_id", investorId)
    .eq("visibility_scope", "investor_visible")
    .eq("is_voided", false)
    .order("event_date", { ascending: false });

  if (options?.fundId) {
    query = query.eq("fund_id", options.fundId);
  }

  if (options?.year && options?.month) {
    const start = new Date(options.year, options.month - 1, 1);
    const end = new Date(options.year, options.month, 0);
    query = query.gte("event_date", formatDateForDB(start)).lte("event_date", formatDateForDB(end));
  }

  query = query.limit(options?.limit || 500);

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as InvestorYieldEvent[];
}

/**
 * Get yield summary by fund for an investor
 * Uses server-side RPC for scalable aggregation (no 500-row ceiling)
 */
export async function getInvestorYieldSummaryByFund(
  investorId: string,
  year?: number,
  month?: number
): Promise<InvestorYieldSummary[]> {
  const { data, error } = await supabase.rpc("get_investor_yield_summary", {
    p_investor_id: investorId,
    p_year: year ?? null,
    p_month: month ?? null,
  });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    fundId: row.fund_id,
    fundName: row.fund_name || "Unknown",
    fundAsset: row.fund_asset || "USD",
    totalGrossYield: parseFinancial(row.total_gross).toNumber(),
    totalFees: parseFinancial(row.total_fees).toNumber(),
    totalNetYield: parseFinancial(row.total_net).toNumber(),
    eventCount: Number(row.event_count),
  }));
}

export interface CumulativeYieldByFund {
  fundId: string;
  fundName: string;
  fundAsset: string;
  totalNetYield: number;
}

export interface CumulativeYieldResult {
  byFund: CumulativeYieldByFund[];
  eventCount: number;
}

/**
 * Get cumulative yield earned for an investor, grouped by fund
 * Uses server-side RPC for scalable aggregation (no 500-row ceiling)
 * Prevents cross-currency summing (e.g. BTC + USDT)
 */
export async function getInvestorCumulativeYield(
  investorId: string
): Promise<CumulativeYieldResult> {
  const { data, error } = await supabase.rpc("get_investor_cumulative_yield", {
    p_investor_id: investorId,
  });

  if (error) throw error;

  const rows = (data || []) as any[];

  return {
    byFund: rows.map((row) => ({
      fundId: row.fund_id,
      fundName: row.fund_name || "Unknown",
      fundAsset: row.fund_asset || "USD",
      totalNetYield: parseFinancial(row.total_net_yield).toNumber(),
    })),
    eventCount: rows.reduce((sum: number, r: any) => sum + Number(r.event_count), 0),
  };
}
