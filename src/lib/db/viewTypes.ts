/**
 * Typed Database Views
 * 
 * This module provides TypeScript types for database views that are not
 * automatically included in Supabase's generated types.
 * 
 * USAGE:
 *   import { queryView, ViewRow } from "@/lib/db/viewTypes";
 *   const { data } = await queryView("v_liquidity_risk").select("*");
 *   // data is properly typed as ViewRow<"v_liquidity_risk">[]
 */

import { supabase } from "@/integrations/supabase/client";

// =============================================================================
// VIEW TYPE DEFINITIONS
// =============================================================================

/** Liquidity risk monitoring view */
export interface VLiquidityRisk {
  fund_id: string;
  code: string;
  asset: string;
  current_aum: number;
  pending_amount: number;
  approved_amount: number;
  processing_amount: number;
  total_pending: number;
  withdrawal_pressure_pct: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
}

/** Concentration risk monitoring view */
export interface VConcentrationRisk {
  fund_id: string;
  fund_code: string;
  investor_id: string;
  investor_name: string;
  account_type: string;
  position_value: number;
  fund_aum: number;
  ownership_pct: number;
  concentration_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

/** Live investor balances view */
export interface VLiveInvestorBalances {
  investor_id: string;
  fund_id: string;
  fund_name: string;
  fund_code: string;
  shares: number;
  current_value: number;
  cost_basis: number;
}

/** Daily platform metrics (live computed) */
export interface VDailyPlatformMetricsLive {
  metric_date: string;
  active_investors: number;
  total_ibs: number;
  active_funds: number;
  total_platform_aum: number;
  pending_withdrawals: number;
  pending_withdrawal_amount: number;
  yields_today: number;
  refreshed_at: string;
}

/** Fund summary (live computed) */
export interface VFundSummaryLive {
  fund_id: string;
  code: string;
  name: string;
  asset: string;
  status: string;
  investor_count: number;
  investor_aum: number;
  fees_balance: number;
  ib_balance: number;
  total_positions: number;
  latest_aum: number | null;
  latest_aum_date: string | null;
}

/** Orphaned transactions view */
export interface VOrphanedTransactions {
  id: string;
  investor_id: string;
  fund_id: string;
  type: string;
  amount: number;
  tx_date: string;
}

/** Orphaned positions view */
export interface VOrphanedPositions {
  id: string;
  investor_id: string;
  fund_id: string;
  current_value: number;
  shares: number;
}

/** Fee calculation orphans view */
export interface VFeeCalculationOrphans {
  id: string;
  distribution_id: string;
  investor_id: string;
  fund_id: string;
  fee_amount: number;
}

/** Position transaction variance view */
export interface VPositionTransactionVariance {
  investor_id: string;
  fund_id: string;
  position_value: number;
  ledger_value: number;
  variance: number;
}

/** Crystallization dashboard view */
export interface VCrystallizationDashboard {
  fund_id: string;
  fund_code: string;
  fund_name: string;
  asset: string;
  investor_count: number;
  total_positions: number;
  up_to_date: number;
  needs_crystallization: number;
  last_distribution_date: string | null;
  days_since_last: number | null;
  oldest_pending_date: string | null;
}

/** AUM position mismatch view */
export interface VAumPositionMismatch {
  fund_id: string;
  fund_code: string;
  fund_name: string;
  aum_total: number;
  position_total: number;
  variance: number;
  variance_pct: number;
}

/** AUM snapshot health view */
export interface VAumSnapshotHealth {
  fund_id: string;
  fund_code: string;
  fund_name: string;
  last_snapshot_date: string | null;
  days_since_snapshot: number | null;
  snapshot_count: number;
}

/** Investor KPIs view */
export interface VInvestorKpis {
  investor_id: string;
  investor_name: string;
  email: string;
  status: string;
  account_type: string;
  total_aum: number;
  fund_count: number;
  last_transaction_date: string | null;
  pending_withdrawal_count: number;
}

// =============================================================================
// VIEW REGISTRY
// =============================================================================

/** Map of view names to their TypeScript types */
export interface ViewRegistry {
  v_liquidity_risk: VLiquidityRisk;
  v_concentration_risk: VConcentrationRisk;
  v_live_investor_balances: VLiveInvestorBalances;
  v_daily_platform_metrics_live: VDailyPlatformMetricsLive;
  v_fund_summary_live: VFundSummaryLive;
  v_orphaned_transactions: VOrphanedTransactions;
  v_orphaned_positions: VOrphanedPositions;
  v_fee_calculation_orphans: VFeeCalculationOrphans;
  v_position_transaction_variance: VPositionTransactionVariance;
  v_crystallization_dashboard: VCrystallizationDashboard;
  v_aum_position_mismatch: VAumPositionMismatch;
  v_aum_snapshot_health: VAumSnapshotHealth;
  v_investor_kpis: VInvestorKpis;
}

/** All known view names */
export type ViewName = keyof ViewRegistry;

/** Get the row type for a specific view */
export type ViewRow<T extends ViewName> = ViewRegistry[T];

// =============================================================================
// TYPED QUERY FUNCTIONS
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Create a query builder for a database view
 * Returns a Supabase query builder. Results should be cast to the appropriate ViewRow type.
 * 
 * @example
 * const { data } = await queryView("v_liquidity_risk").select("*");
 * const typedData = data as VLiquidityRisk[];
 */
export function queryView(viewName: ViewName) {
  return (supabase as any).from(viewName);
}

/**
 * Fetch all rows from a view with proper typing
 * 
 * @example
 * const data = await fetchView("v_fund_summary_live");
 * // data is VFundSummaryLive[]
 */
export async function fetchView<T extends ViewName>(
  viewName: T,
  options?: { limit?: number; orderBy?: string; ascending?: boolean }
): Promise<ViewRow<T>[]> {
  let query = queryView(viewName).select("*");

  if (options?.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? true });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[viewTypes] Error fetching ${viewName}:`, error);
    return [];
  }

  return (data || []) as ViewRow<T>[];
}

/**
 * Fetch a single row from a view
 */
export async function fetchViewSingle<T extends ViewName>(
  viewName: T,
  filter: { column: string; value: unknown }
): Promise<ViewRow<T> | null> {
  const { data, error } = await queryView(viewName)
    .select("*")
    .eq(filter.column, filter.value)
    .maybeSingle();

  if (error) {
    console.error(`[viewTypes] Error fetching single from ${viewName}:`, error);
    return null;
  }

  return data as ViewRow<T> | null;
}

/* eslint-enable @typescript-eslint/no-explicit-any */
