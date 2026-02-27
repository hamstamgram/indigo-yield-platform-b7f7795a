/**
 * Investor Yield Service
 * Investor-facing yield queries sourced from `transactions_v2`.
 * The legacy `investor_yield_events` table has been removed (V6 architecture).
 */

import { supabase } from "@/integrations/supabase/client";
import { formatDateForDB } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";

/**
 * A single yield (or fee) ledger entry visible to the investor,
 * mapped from the `transactions_v2` table.
 */
export interface InvestorYieldEvent {
  id: string;
  investor_id: string;
  fund_id: string;
  event_date: string; // tx_date from ledger
  trigger_type: string; // equals tx_type: 'YIELD' | 'FEE'
  /** Balance at time of event (from position snapshot — not tracked per tx, so 0 for now) */
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
 * Get visible yield events (YIELD and FEE ledger entries) for an investor.
 * Sources from `transactions_v2` — the single source of truth in V6.
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
    .from("transactions_v2")
    .select(
      `
      id,
      investor_id,
      fund_id,
      tx_date,
      type,
      amount,
      notes,
      reference_id,
      created_at,
      fund:funds(name, asset, code)
    `
    )
    .eq("investor_id", investorId)
    .in("type", ["YIELD", "FEE_CREDIT"])
    .eq("is_voided", false)
    .order("tx_date", { ascending: false });

  if (options?.fundId) {
    query = query.eq("fund_id", options.fundId);
  }

  if (options?.year) {
    if (options?.month) {
      const start = new Date(options.year, options.month - 1, 1);
      const end = new Date(options.year, options.month, 0);
      query = query.gte("tx_date", formatDateForDB(start)).lte("tx_date", formatDateForDB(end));
    } else {
      const yearStart = new Date(options.year, 0, 1);
      const yearEnd = new Date(options.year, 11, 31);
      query = query
        .gte("tx_date", formatDateForDB(yearStart))
        .lte("tx_date", formatDateForDB(yearEnd));
    }
  }

  query = query.limit(options?.limit || 500);

  const { data, error } = await query;
  if (error) throw error;

  // Map flat ledger rows to the InvestorYieldEvent shape
  return (data || []).map((row: any) => {
    const amount = parseFinancial(row.amount).toNumber();
    const isYield = row.type === "YIELD";
    const isFee = row.type === "FEE_CREDIT";

    return {
      id: row.id,
      investor_id: row.investor_id,
      fund_id: row.fund_id,
      event_date: row.tx_date,
      trigger_type: row.type,
      investor_balance: 0, // not stored per-tx in V6 ledger
      investor_share_pct: 0, // not stored per-tx in V6 ledger
      fund_yield_pct: 0, // not stored per-tx in V6 ledger
      gross_yield_amount: isYield ? amount : 0,
      fee_pct: 0, // not stored per-tx in V6 ledger
      fee_amount: isFee ? Math.abs(amount) : 0,
      net_yield_amount: amount, // YIELD positive, FEE negative — net effect
      period_start: row.tx_date,
      period_end: row.tx_date,
      days_in_period: 0,
      made_visible_at: row.created_at,
      created_at: row.created_at,
      fund: row.fund
        ? { name: row.fund.name, asset: row.fund.asset, code: row.fund.code }
        : undefined,
    };
  });
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
    if (e.trigger_type !== "YIELD") continue;
    const existing = fundMap.get(e.fund_id);
    if (existing) {
      existing.totalNetYield = parseFinancial(existing.totalNetYield)
        .plus(parseFinancial(e.net_yield_amount))
        .toNumber();
      existing.count += 1;
    } else {
      fundMap.set(e.fund_id, {
        fundId: e.fund_id,
        fundName: e.fund?.name || "Unknown",
        fundAsset: e.fund?.asset || "USD",
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
