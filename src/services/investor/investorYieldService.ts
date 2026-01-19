/**
 * Investor Yield Service
 * Investor-facing yield queries (only shows investor_visible events)
 */

import { supabase } from "@/integrations/supabase/client";
import { formatDateForDB } from "@/utils/dateUtils";

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
    .select(`
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
    `)
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
    query = query
      .gte("event_date", formatDateForDB(start))
      .lte("event_date", formatDateForDB(end));
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as InvestorYieldEvent[];
}

/**
 * Get yield summary by fund for an investor
 */
export async function getInvestorYieldSummaryByFund(
  investorId: string,
  year?: number,
  month?: number
): Promise<InvestorYieldSummary[]> {
  let query = supabase
    .from("investor_yield_events")
    .select(`
      fund_id,
      gross_yield_amount,
      fee_amount,
      net_yield_amount,
      fund:funds(name, asset)
    `)
    .eq("investor_id", investorId)
    .eq("visibility_scope", "investor_visible")
    .eq("is_voided", false);

  if (year && month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    query = query
      .gte("event_date", formatDateForDB(start))
      .lte("event_date", formatDateForDB(end));
  }

  const { data, error } = await query;

  if (error) throw error;

  // Aggregate by fund
  const byFund = new Map<string, InvestorYieldSummary>();

  for (const row of data || []) {
    const fundData = row.fund as { name: string; asset: string } | null;
    const existing = byFund.get(row.fund_id);
    
    if (existing) {
      existing.totalGrossYield += Number(row.gross_yield_amount);
      existing.totalFees += Number(row.fee_amount);
      existing.totalNetYield += Number(row.net_yield_amount);
      existing.eventCount += 1;
    } else {
      byFund.set(row.fund_id, {
        fundId: row.fund_id,
        fundName: fundData?.name || "Unknown",
        fundAsset: fundData?.asset || "USD",
        totalGrossYield: Number(row.gross_yield_amount),
        totalFees: Number(row.fee_amount),
        totalNetYield: Number(row.net_yield_amount),
        eventCount: 1,
      });
    }
  }

  return Array.from(byFund.values());
}

/**
 * Get cumulative yield earned for an investor across all funds
 */
export async function getInvestorCumulativeYield(
  investorId: string
): Promise<{
  totalGrossYield: number;
  totalFees: number;
  totalNetYield: number;
  eventCount: number;
}> {
  const { data, error } = await supabase
    .from("investor_yield_events")
    .select("gross_yield_amount, fee_amount, net_yield_amount")
    .eq("investor_id", investorId)
    .eq("visibility_scope", "investor_visible")
    .eq("is_voided", false);

  if (error) throw error;

  const events = data || [];
  
  return {
    totalGrossYield: events.reduce((sum, e) => sum + Number(e.gross_yield_amount), 0),
    totalFees: events.reduce((sum, e) => sum + Number(e.fee_amount), 0),
    totalNetYield: events.reduce((sum, e) => sum + Number(e.net_yield_amount), 0),
    eventCount: events.length,
  };
}
