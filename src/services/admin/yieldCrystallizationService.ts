/**
 * Yield Crystallization Service
 * Handles automatic yield crystallization on capital events
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";

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
    p_fund_id: fundId,                           // 1. uuid
    p_closing_aum: Number(closingAum),           // 2. numeric
    p_trigger_type: triggerType,                 // 3. text
    p_trigger_reference: triggerReference || null, // 4. text (nullable)
    p_event_ts: eventTs.toISOString(),           // 5. timestamptz
    p_admin_id: adminId || null,                 // 6. uuid (nullable)
    p_purpose: "transaction",                    // 7. aum_purpose enum
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
    query = query.gte("event_date", options.startDate.toISOString().split("T")[0]);
  }
  if (options?.endDate) {
    query = query.lte("event_date", options.endDate.toISOString().split("T")[0]);
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
  }
): Promise<YieldEvent[]> {
  let query = supabase
    .from("investor_yield_events")
    .select("*")
    .eq("investor_id", investorId)
    .eq("is_voided", false)
    .order("event_date", { ascending: false });

  if (options?.fundId) {
    query = query.eq("fund_id", options.fundId);
  }
  if (options?.startDate) {
    query = query.gte("event_date", options.startDate.toISOString().split("T")[0]);
  }
  if (options?.endDate) {
    query = query.lte("event_date", options.endDate.toISOString().split("T")[0]);
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
): Promise<{
  investor_id: string;
  total_gross_yield: number;
  total_fees: number;
  total_net_yield: number;
  crystallization_count: number;
}[]> {
  const startStr = periodStart.toISOString().split("T")[0];
  const endStr = periodEnd.toISOString().split("T")[0];

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
  const aggregated = new Map<string, {
    investor_id: string;
    total_gross_yield: number;
    total_fees: number;
    total_net_yield: number;
    crystallization_count: number;
  }>();

  for (const row of data || []) {
    const existing = aggregated.get(row.investor_id);
    if (existing) {
      existing.total_gross_yield += Number(row.gross_yield_amount);
      existing.total_fees += Number(row.fee_amount);
      existing.total_net_yield += Number(row.net_yield_amount);
      existing.crystallization_count += 1;
    } else {
      aggregated.set(row.investor_id, {
        investor_id: row.investor_id,
        total_gross_yield: Number(row.gross_yield_amount),
        total_fees: Number(row.fee_amount),
        total_net_yield: Number(row.net_yield_amount),
        crystallization_count: 1,
      });
    }
  }

  return Array.from(aggregated.values());
}

/**
 * Get fund yield snapshots
 */
export async function getFundYieldSnapshots(
  fundId: string,
  limit = 30
): Promise<YieldSnapshot[]> {
  const { data, error } = await supabase
    .from("fund_yield_snapshots")
    .select("*")
    .eq("fund_id", fundId)
    .eq("is_voided", false)
    .order("snapshot_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as YieldSnapshot[];
}

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
    .gte("event_date", periodStart.toISOString().split("T")[0])
    .lte("event_date", periodEnd.toISOString().split("T")[0]);

  if (error) throw error;

  const count = data?.length || 0;
  const totalYield = data?.reduce((sum, row) => sum + Number(row.net_yield_amount), 0) || 0;

  return { count, totalYield };
}

/**
 * Crystallize month-end yield for a fund
 * Creates a month_end trigger in fund_aum_events and crystallizes yield for all positions
 */
export async function crystallizeMonthEnd(
  fundId: string,
  monthEndDate: Date,
  closingAum: string,
  adminId: string
): Promise<CrystallizationResult> {
  const { data, error } = await callRPC("crystallize_month_end", {
    p_fund_id: fundId,
    p_month_end_date: monthEndDate.toISOString().split("T")[0],
    p_closing_aum: Number(closingAum),
    p_admin_id: adminId,
  });

  if (error) {
    logError("crystallizeMonthEnd", error, { fundId, monthEndDate: monthEndDate.toISOString() });
    throw new Error(error.message);
  }

  return data as unknown as CrystallizationResult;
}
