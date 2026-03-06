/**
 * Yield Crystallization Service
 * V6 ARCHITECTURE: Crystallization is abolished. AUM-to-AUM flat math drives all yield.
 * The `investor_yield_events` table has been dropped. All queries now sourced from `transactions_v2`.
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { formatDateForDB } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";
import type {
  CrystallizationResult,
  FinalizationResult,
} from "@/types/domains/yieldCrystallization";

// CrystallizationResult and FinalizationResult imported from @/types/domains/yieldCrystallization
export type { CrystallizationResult, FinalizationResult };

export interface YieldEvent {
  id: string;
  investor_id: string;
  fund_id: string;
  event_date: string;
  trigger_type: string;
  trigger_transaction_id: string | null;
  fund_aum_before: string;
  fund_aum_after: string;
  investor_balance: string;
  investor_share_pct: string;
  fund_yield_pct: string;
  gross_yield_amount: string;
  fee_pct: string;
  fee_amount: string;
  net_yield_amount: string;
  ib_amount: string | null;
  period_start: string;
  period_end: string;
  days_in_period: number;
  made_visible_at: string | null;
  is_voided: boolean;
  created_at: string;
}

// YieldSnapshot interface removed — fund_yield_snapshots table was dropped in P1-03

/**
 * Finalize month yield - make yield events visible to investors
 */
export async function finalizeMonthYield(
  fundId: string,
  year: number,
  month: number,
  adminId: string
): Promise<FinalizationResult> {
  const { data, error } = await callRPC("finalize_month_yield", {
    p_fund_id: fundId,
    p_period_year: year,
    p_period_month: month,
    p_admin_id: adminId,
  });

  if (error) {
    logError("finalizeMonthYield", error, { fundId, year, month });
    throw new Error(error.message);
  }

  return data as unknown as FinalizationResult;
}

/**
 * Get yield/fee ledger entries for a fund (admin view - from transactions_v2)
 */
export async function getYieldEventsForFund(
  fundId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    includeVoided?: boolean;
  }
): Promise<YieldEvent[]> {
  let query = supabase
    .from("transactions_v2")
    .select("*")
    .eq("fund_id", fundId)
    .in("type", ["YIELD", "FEE"])
    .order("tx_date", { ascending: false });

  if (options?.startDate) {
    query = query.gte("tx_date", formatDateForDB(options.startDate));
  }
  if (options?.endDate) {
    query = query.lte("tx_date", formatDateForDB(options.endDate));
  }
  if (!options?.includeVoided) {
    query = query.eq("is_voided", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as YieldEvent[];
}

/**
 * Get yield/fee ledger entries for an investor (admin view - from transactions_v2)
 */
export async function getYieldEventsForInvestor(
  investorId: string,
  options?: {
    fundId?: string;
    startDate?: Date;
    endDate?: Date;
    includeVoided?: boolean;
  }
): Promise<YieldEvent[]> {
  let query = supabase
    .from("transactions_v2")
    .select("*")
    .eq("investor_id", investorId)
    .in("type", ["YIELD", "FEE"])
    .order("tx_date", { ascending: false });

  if (!options?.includeVoided) {
    query = query.eq("is_voided", false);
  }
  if (options?.fundId) {
    query = query.eq("fund_id", options.fundId);
  }
  if (options?.startDate) {
    query = query.gte("tx_date", formatDateForDB(options.startDate));
  }
  if (options?.endDate) {
    query = query.lte("tx_date", formatDateForDB(options.endDate));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as YieldEvent[];
}

/**
 * Get aggregated yield/fee summary for a period, by investor (from transactions_v2)
 */
export async function getAggregatedYieldForPeriod(
  fundId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<
  {
    investor_id: string;
    total_gross_yield: number;
    total_fees: number;
    total_net_yield: number;
    crystallization_count: number;
  }[]
> {
  const startStr = formatDateForDB(periodStart);
  const endStr = formatDateForDB(periodEnd);

  const { data, error } = await supabase
    .from("transactions_v2")
    .select("investor_id, type, amount")
    .eq("fund_id", fundId)
    .eq("is_voided", false)
    .in("type", ["YIELD", "FEE"])
    .gte("tx_date", startStr)
    .lte("tx_date", endStr);

  if (error) throw error;

  const aggregated = new Map<
    string,
    {
      investor_id: string;
      total_gross_yield: number;
      total_fees: number;
      total_net_yield: number;
      crystallization_count: number;
    }
  >();

  for (const row of data || []) {
    const amount = parseFinancial(row.amount).toNumber();
    const isYield = row.type === "YIELD";
    const isFee = row.type === "FEE";
    const existing = aggregated.get(row.investor_id);
    if (existing) {
      if (isYield)
        existing.total_gross_yield = parseFinancial(existing.total_gross_yield)
          .plus(amount)
          .toNumber();
      if (isFee)
        existing.total_fees = parseFinancial(existing.total_fees).plus(Math.abs(amount)).toNumber();
      existing.total_net_yield = parseFinancial(existing.total_net_yield).plus(amount).toNumber();
      existing.crystallization_count += 1;
    } else {
      aggregated.set(row.investor_id, {
        investor_id: row.investor_id,
        total_gross_yield: isYield ? amount : 0,
        total_fees: isFee ? Math.abs(amount) : 0,
        total_net_yield: amount,
        crystallization_count: 1,
      });
    }
  }

  return Array.from(aggregated.values());
}

/**
 * Per-investor crystallization event for yield preview sub-rows
 */
export interface InvestorCrystallizationEvent {
  investorId: string;
  eventDate: string;
  triggerType: string;
  grossYield: string;
  feeAmount: string;
  ibAmount: string;
  netYield: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transaction: "Flow",
};

/**
 * Get per-investor YIELD/FEE events for a fund in a date range (from transactions_v2).
 * Returns a Map<investorId, events[]>.
 * Replaces the former `getInvestorCrystallizationEvents` which used the dropped investor_yield_events.
 */
export async function getInvestorCrystallizationEvents(
  fundId: string,
  periodStart: string,
  periodEnd: string
): Promise<Map<string, InvestorCrystallizationEvent[]>> {
  const { data, error } = await supabase
    .from("transactions_v2")
    .select("investor_id, tx_date, type, amount, notes")
    .eq("fund_id", fundId)
    .gte("tx_date", periodStart)
    .lte("tx_date", periodEnd)
    .eq("is_voided", false)
    .in("type", ["YIELD", "FEE"])
    .order("tx_date", { ascending: true });

  if (error) {
    logError("getInvestorCrystallizationEvents", error, { fundId, periodStart, periodEnd });
    throw new Error(error.message);
  }

  const result = new Map<string, InvestorCrystallizationEvent[]>();

  for (const row of data || []) {
    const amount = parseFinancial(row.amount).toNumber();
    const isYield = row.type === "YIELD";
    const isFee = row.type === "FEE";
    const event: InvestorCrystallizationEvent = {
      investorId: row.investor_id,
      eventDate: row.tx_date,
      triggerType: row.type,
      grossYield: isYield ? String(amount) : "0",
      feeAmount: isFee ? String(Math.abs(amount)) : "0",
      ibAmount: "0",
      netYield: String(amount),
    };

    const existing = result.get(row.investor_id);
    if (existing) {
      existing.push(event);
    } else {
      result.set(row.investor_id, [event]);
    }
  }

  return result;
}

// getFundYieldSnapshots and YieldSnapshot removed in P1-03 (Unify AUM Snapshot Tables)

/**
 * Get pending (admin_only) yield events count for a fund in a period
 */
export async function getPendingYieldEventsCount(
  fundId: string,
  year: number,
  month: number
): Promise<{ count: number; totalYield: number }> {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  // Query non-voided daily (checkpoint) distributions in the period
  const { data, error } = await supabase
    .from("yield_distributions")
    .select("id, net_yield")
    .eq("fund_id", fundId)
    .eq("is_voided", false)
    .eq("distribution_type", "daily")
    .gte("period_start", formatDateForDB(periodStart))
    .lte("period_end", formatDateForDB(periodEnd));

  if (error) {
    logError("getPendingYieldEventsCount", error, { fundId, year, month });
    throw error;
  }

  const count = data?.length || 0;
  const totalYield =
    data
      ?.reduce((sum, row) => sum.plus(parseFinancial(row.net_yield)), parseFinancial(0))
      .toNumber() || 0;

  return { count, totalYield };
}
