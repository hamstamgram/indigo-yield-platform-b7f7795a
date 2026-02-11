/**
 * Yield Crystallization Service
 * Handles automatic yield crystallization on capital events
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { formatDateForDB } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";

export interface CrystallizationResult {
  success: boolean;
  fund_id?: string;
  event_id?: string;
  opening_aum?: string;
  closing_aum?: string;
  gross_yield?: string;
  yield_tx_count?: number;
  allocated_sum?: string;
  remainder?: string;
}

export interface FinalizationResult {
  success: boolean;
  fund_id: string;
  period_start: string;
  period_end: string;
  events_made_visible: number;
  total_yield_finalized: number;
}

export interface YieldEvent {
  id: string;
  investor_id: string;
  fund_id: string;
  event_date: string;
  trigger_type: string;
  trigger_transaction_id: string | null;
  fund_aum_before: number;
  fund_aum_after: number;
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
  visibility_scope: "admin_only" | "investor_visible";
  made_visible_at: string | null;
  is_voided: boolean;
  created_at: string;
}

export interface YieldSnapshot {
  id: string;
  fund_id: string;
  snapshot_date: string;
  opening_aum: number;
  closing_aum: number;
  gross_yield_pct: number;
  gross_yield_amount: number;
  period_start: string;
  period_end: string;
  days_in_period: number;
  trigger_type: string;
  is_voided: boolean;
  created_at: string;
}

/**
 * Crystallize yield before a capital flow (deposit/withdrawal)
 */
export async function crystallizeYieldBeforeFlow(
  fundId: string,
  triggerType: "deposit" | "withdrawal" | "month_end" | "manual",
  eventTs: Date,
  closingAum: string,
  triggerReference?: string,
  adminId?: string
): Promise<CrystallizationResult> {
  // Parameter order matches database function signature:
  // crystallize_yield_before_flow(p_fund_id, p_closing_aum, p_trigger_type,
  //   p_trigger_reference, p_event_ts, p_admin_id, p_purpose)
  const { data, error } = await callRPC("crystallize_yield_before_flow", {
    p_fund_id: fundId, // 1. uuid
    p_closing_aum: parseFinancial(closingAum).toString() as unknown as number, // 2. numeric - string for precision
    p_trigger_type: triggerType, // 3. text
    p_trigger_reference: triggerReference || null, // 4. text (nullable)
    p_event_ts: eventTs.toISOString(), // 5. timestamptz
    p_admin_id: adminId || null, // 6. uuid (nullable)
    p_purpose: "transaction", // 7. aum_purpose enum
  });

  if (error) {
    logError("crystallizeYieldBeforeFlow", error, { fundId, triggerType });
    throw new Error(error.message);
  }

  return data as unknown as CrystallizationResult;
}

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
 * Get yield events for a fund (admin view - all events)
 */
export async function getYieldEventsForFund(
  fundId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    visibilityScope?: "all" | "admin_only" | "investor_visible";
    includeVoided?: boolean;
  }
): Promise<YieldEvent[]> {
  let query = supabase
    .from("investor_yield_events")
    .select("*")
    .eq("fund_id", fundId)
    .order("event_date", { ascending: false });

  if (options?.startDate) {
    query = query.gte("event_date", formatDateForDB(options.startDate));
  }
  if (options?.endDate) {
    query = query.lte("event_date", formatDateForDB(options.endDate));
  }
  if (options?.visibilityScope && options.visibilityScope !== "all") {
    query = query.eq("visibility_scope", options.visibilityScope);
  }
  if (!options?.includeVoided) {
    query = query.eq("is_voided", false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as YieldEvent[];
}

/**
 * Get yield events for an investor (admin view - all events)
 */
export async function getYieldEventsForInvestor(
  investorId: string,
  options?: {
    fundId?: string;
    startDate?: Date;
    endDate?: Date;
    visibilityScope?: "all" | "admin_only" | "investor_visible";
    includeVoided?: boolean;
  }
): Promise<YieldEvent[]> {
  let query = supabase
    .from("investor_yield_events")
    .select("*")
    .eq("investor_id", investorId)
    .order("event_date", { ascending: false });

  if (!options?.includeVoided) {
    query = query.eq("is_voided", false);
  }

  if (options?.fundId) {
    query = query.eq("fund_id", options.fundId);
  }
  if (options?.startDate) {
    query = query.gte("event_date", formatDateForDB(options.startDate));
  }
  if (options?.endDate) {
    query = query.lte("event_date", formatDateForDB(options.endDate));
  }
  if (options?.visibilityScope && options.visibilityScope !== "all") {
    query = query.eq("visibility_scope", options.visibilityScope);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as YieldEvent[];
}

/**
 * Get aggregated yield for a period
 */
export async function getAggregatedYieldForPeriod(
  fundId: string,
  periodStart: Date,
  periodEnd: Date,
  visibilityFilter?: "all" | "admin_only" | "investor_visible"
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

  let query = supabase
    .from("investor_yield_events")
    .select("investor_id, gross_yield_amount, fee_amount, net_yield_amount")
    .eq("fund_id", fundId)
    .eq("is_voided", false)
    .gte("event_date", startStr)
    .lte("event_date", endStr);

  if (visibilityFilter && visibilityFilter !== "all") {
    query = query.eq("visibility_scope", visibilityFilter);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Aggregate in JS since Supabase doesn't support GROUP BY in select
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
    const existing = aggregated.get(row.investor_id);
    if (existing) {
      existing.total_gross_yield = parseFinancial(existing.total_gross_yield)
        .plus(parseFinancial(row.gross_yield_amount))
        .toNumber();
      existing.total_fees = parseFinancial(existing.total_fees)
        .plus(parseFinancial(row.fee_amount))
        .toNumber();
      existing.total_net_yield = parseFinancial(existing.total_net_yield)
        .plus(parseFinancial(row.net_yield_amount))
        .toNumber();
      existing.crystallization_count += 1;
    } else {
      aggregated.set(row.investor_id, {
        investor_id: row.investor_id,
        total_gross_yield: parseFinancial(row.gross_yield_amount).toNumber(),
        total_fees: parseFinancial(row.fee_amount).toNumber(),
        total_net_yield: parseFinancial(row.net_yield_amount).toNumber(),
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
 * Get per-investor crystallization events for a fund in a date range.
 * Returns a Map<investorId, events[]> from investor_yield_events table.
 */
export async function getInvestorCrystallizationEvents(
  fundId: string,
  periodStart: string,
  periodEnd: string
): Promise<Map<string, InvestorCrystallizationEvent[]>> {
  const { data, error } = await supabase
    .from("investor_yield_events")
    .select(
      "investor_id, event_date, trigger_type, gross_yield_amount, fee_amount, net_yield_amount"
    )
    .eq("fund_id", fundId)
    .gte("event_date", periodStart)
    .lte("event_date", periodEnd)
    .eq("is_voided", false)
    .in("trigger_type", ["deposit", "withdrawal", "transaction"])
    .order("event_date", { ascending: true });

  if (error) {
    logError("getInvestorCrystallizationEvents", error, { fundId, periodStart, periodEnd });
    throw new Error(error.message);
  }

  const result = new Map<string, InvestorCrystallizationEvent[]>();

  for (const row of data || []) {
    const event: InvestorCrystallizationEvent = {
      investorId: row.investor_id,
      eventDate: row.event_date,
      triggerType: TRIGGER_LABELS[row.trigger_type] || row.trigger_type,
      grossYield: String(row.gross_yield_amount ?? 0),
      feeAmount: String(row.fee_amount ?? 0),
      ibAmount: "0",
      netYield: String(row.net_yield_amount ?? 0),
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

// Note: getFundYieldSnapshots removed in P1-03 (Unify AUM Snapshot Tables)
// The fund_yield_snapshots table was unused (0 rows) and has been dropped.

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

  const { data, error } = await supabase
    .from("investor_yield_events")
    .select("net_yield_amount")
    .eq("fund_id", fundId)
    .eq("visibility_scope", "admin_only")
    .eq("is_voided", false)
    .gte("event_date", formatDateForDB(periodStart))
    .lte("event_date", formatDateForDB(periodEnd));

  if (error) throw error;

  const count = data?.length || 0;
  const totalYield =
    data
      ?.reduce((sum, row) => sum.plus(parseFinancial(row.net_yield_amount)), parseFinancial(0))
      .toNumber() || 0;

  return { count, totalYield };
}

/**
 * Crystallize month-end yield for a fund
 * Crystallizes yield for all positions at month end
 */
export async function crystallizeMonthEnd(
  fundId: string,
  monthEndDate: Date,
  closingAum: string,
  adminId: string
): Promise<CrystallizationResult> {
  const { data, error } = await callRPC("crystallize_month_end", {
    p_fund_id: fundId,
    p_month_end_date: formatDateForDB(monthEndDate),
    p_closing_aum: parseFinancial(closingAum).toString() as unknown as number,
    p_admin_id: adminId,
  });

  if (error) {
    logError("crystallizeMonthEnd", error, { fundId, monthEndDate: monthEndDate.toISOString() });
    throw new Error(error.message);
  }

  return data as unknown as CrystallizationResult;
}
