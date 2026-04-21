/**
 * Investor Yield Service
 * Investor-facing yield queries sourced from `transactions_v2`.
 * The legacy `investor_yield_events` table has been removed (V6 architecture).
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
  ib_pct: number;
  ib_amount: number;
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
  totalIB: number;
  totalNetYield: number;
  eventCount: number;
}

export interface CumulativeYieldByFund {
  fundId: string;
  fundName: string;
  fundAsset: string;
  totalGrossYield: number;
  totalFees: number;
  totalIB: number;
  totalNetYield: number;
}

export interface CumulativeYieldResult {
  byFund: CumulativeYieldByFund[];
  eventCount: number;
}

/**
 * Get visible yield events for an investor with full fee breakdown.
 * Primary source: yield_allocations (has gross, fee%, fee amount, IB, net).
 * Enriched with distribution date and fund details from yield_distributions + funds.
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
    .from("yield_allocations")
    .select(
      `
      id,
      investor_id,
      fund_id,
      distribution_id,
      gross_amount,
      fee_pct,
      fee_amount,
      ib_pct,
      ib_amount,
      net_amount,
      created_at,
      distribution:yield_distributions!distribution_id (
        effective_date,
        purpose,
        fund_id,
        fund:funds!fund_id (name, asset, code)
      )
    `
    )
    .eq("investor_id", investorId)
    .eq("is_voided", false)
    .order("created_at", { ascending: false });

  if (options?.fundId) {
    query = query.eq("fund_id", options.fundId);
  }

  query = query.limit(options?.limit || 500);

  const { data, error } = await query;
  if (error) throw error;

  let results = (data || []).map((row: any) => {
    const dist = row.distribution || {};
    const fund = dist.fund || {};
    const eventDate = dist.effective_date || row.created_at;

    return {
      id: row.id,
      investor_id: row.investor_id,
      fund_id: row.fund_id,
      event_date: eventDate,
      trigger_type: dist.purpose || "reporting",
      investor_balance: 0,
      investor_share_pct: 0,
      fund_yield_pct: 0,
      gross_yield_amount: parseFinancial(row.gross_amount || 0).toNumber(),
      fee_pct: parseFinancial(row.fee_pct || 0).toNumber(),
      fee_amount: parseFinancial(row.fee_amount || 0).toNumber(),
      ib_pct: parseFinancial(row.ib_pct || 0).toNumber(),
      ib_amount: parseFinancial(row.ib_amount || 0).toNumber(),
      net_yield_amount: parseFinancial(row.net_amount || 0).toNumber(),
      period_start: eventDate,
      period_end: eventDate,
      days_in_period: 0,
      made_visible_at: row.created_at,
      created_at: row.created_at,
      fund: fund.name ? { name: fund.name, asset: fund.asset, code: fund.code } : undefined,
    };
  });

  if (options?.year) {
    results = results.filter((r) => {
      const d = new Date(r.event_date);
      if (options.month) {
        return d.getFullYear() === options.year && d.getMonth() + 1 === options.month;
      }
      return d.getFullYear() === options.year;
    });
  }

  return results;
}

/**
 * Get yield summary by fund for an investor.
 * Computed client-side from transactions_v2 (investor_visible rows).
 */
export async function getInvestorYieldSummaryByFund(
  investorId: string,
  year?: number,
  month?: number
): Promise<InvestorYieldSummary[]> {
  const events = await getInvestorVisibleYield(investorId, { year, month });

  const fundMap = new Map<string, InvestorYieldSummary>();

  for (const e of events) {
    const existing = fundMap.get(e.fund_id);
    if (existing) {
      existing.totalGrossYield = parseFinancial(existing.totalGrossYield)
        .plus(parseFinancial(e.gross_yield_amount))
        .toNumber();
      existing.totalFees = parseFinancial(existing.totalFees)
        .plus(parseFinancial(e.fee_amount))
        .toNumber();
      existing.totalIB = parseFinancial(existing.totalIB)
        .plus(parseFinancial(e.ib_amount))
        .toNumber();
      existing.totalNetYield = parseFinancial(existing.totalNetYield)
        .plus(parseFinancial(e.net_yield_amount))
        .toNumber();
      existing.eventCount += 1;
    } else {
      fundMap.set(e.fund_id, {
        fundId: e.fund_id,
        fundName: e.fund?.name || "Unknown",
        fundAsset: e.fund?.asset || "USD",
        totalGrossYield: e.gross_yield_amount,
        totalFees: e.fee_amount,
        totalIB: e.ib_amount,
        totalNetYield: e.net_yield_amount,
        eventCount: 1,
      });
    }
  }

  return Array.from(fundMap.values());
}

/**
 * Get cumulative yield earned for an investor, grouped by fund.
 * Computed client-side from transactions_v2 (investor_visible rows).
 */
export async function getInvestorCumulativeYield(
  investorId: string
): Promise<CumulativeYieldResult> {
  const events = await getInvestorVisibleYield(investorId);

  const fundMap = new Map<string, CumulativeYieldByFund & { count: number }>();

  for (const e of events) {
    if (
      e.trigger_type !== "YIELD" &&
      e.trigger_type !== "reporting" &&
      e.trigger_type !== "transaction"
    )
      continue;
    const existing = fundMap.get(e.fund_id);
    if (existing) {
      existing.totalGrossYield = parseFinancial(existing.totalGrossYield)
        .plus(parseFinancial(e.gross_yield_amount))
        .toNumber();
      existing.totalFees = parseFinancial(existing.totalFees)
        .plus(parseFinancial(e.fee_amount))
        .toNumber();
      existing.totalIB = parseFinancial(existing.totalIB)
        .plus(parseFinancial(e.ib_amount))
        .toNumber();
      existing.totalNetYield = parseFinancial(existing.totalNetYield)
        .plus(parseFinancial(e.net_yield_amount))
        .toNumber();
      existing.count += 1;
    } else {
      fundMap.set(e.fund_id, {
        fundId: e.fund_id,
        fundName: e.fund?.name || "Unknown",
        fundAsset: e.fund?.asset || "USD",
        totalGrossYield: e.gross_yield_amount,
        totalFees: e.fee_amount,
        totalIB: e.ib_amount,
        totalNetYield: e.net_yield_amount,
        count: 1,
      });
    }
  }

  const entries = Array.from(fundMap.values());

  return {
    byFund: entries.map(({ count: _, ...rest }) => rest),
    eventCount: entries.reduce((sum, r) => sum + r.count, 0),
  };
}
