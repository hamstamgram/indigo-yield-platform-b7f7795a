/**
 * Dashboard Metrics Service
 *
 * Service layer for admin dashboard metrics and analytics.
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { parseFinancial } from "@/utils/financial";
import { logError } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface AUMHistoryPoint {
  date: string;
  aum: number;
}

export interface FlowMetrics {
  totalDeposits: number;
  totalWithdrawals: number;
  netFlow: number;
}

export interface FinancialMetrics {
  totalAum: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netFlow: number;
  history: AUMHistoryPoint[];
}

export interface FlowData {
  fund_id: string;
  daily_inflows: number;
  daily_outflows: number;
  net_flow_24h: number;
  aum: number;
}

/** RPC result from get_historical_nav */
interface HistoricalNavItem {
  fund_id?: string;
  out_fund_id?: string;
  daily_inflows?: number;
  out_daily_inflows?: number;
  daily_outflows?: number;
  out_daily_outflows?: number;
  net_flow_24h?: number;
  out_net_flow_24h?: number;
  aum?: number;
  out_aum?: number;
}

/** Position with profile join result */
interface PositionWithProfile {
  current_value: number | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    account_type: string | null;
  } | null;
}

export interface InvestorComposition {
  investor_name: string;
  email: string;
  balance: number;
  ownership_pct: number;
  account_type: string;
}

export interface DeliveryRecord {
  id: string;
  status: string;
  recipient_email: string;
  channel: string;
  attempt_count: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface DeliveryDiagnostics {
  statements_generated: number;
  investors_with_statements: number;
  investors_with_email: number;
  investors_missing_email: number;
  deliveries_queued: number;
  deliveries_sent: number;
  deliveries_failed: number;
  already_delivered: number;
  missing_email_names: string[];
}

export interface ExclusionBreakdown {
  totalInvestors: number;
  statementsGenerated: number;
  eligibleForDelivery: number;
  alreadySent: number;
  queued: number;
  failed: number;
  skipped: number;
  missingEmail: number;
  noStatement: number;
  cancelled: number;
}

// ============================================================================
// Performance Dashboard Functions
// ============================================================================

/**
 * Fetch AUM history
 * NOTE: daily_nav table was dropped - returns empty
 */
export async function getAUMHistory(): Promise<AUMHistoryPoint[]> {
  return [];
}

/**
 * Fetch transaction flow metrics (deposits/withdrawals)
 */
export async function getTransactionFlowMetrics(): Promise<FlowMetrics> {
  const { data, error } = await rpc.call("get_platform_flow_metrics", {
    p_days: 30,
  });

  if (error) {
    logError("dashboardMetrics.fetchFlowMetrics", error);
    return { totalDeposits: 0, totalWithdrawals: 0, netFlow: 0 };
  }

  return data as unknown as FlowMetrics;
}

/**
 * Get combined financial metrics for performance dashboard
 */
export async function getFinancialMetrics(): Promise<FinancialMetrics> {
  const [history, flowMetrics] = await Promise.all([getAUMHistory(), getTransactionFlowMetrics()]);

  return {
    totalAum: history[history.length - 1]?.aum || 0,
    totalDeposits: flowMetrics.totalDeposits,
    totalWithdrawals: flowMetrics.totalWithdrawals,
    netFlow: flowMetrics.netFlow,
    history,
  };
}

// ============================================================================
// Financial Snapshot Functions
// ============================================================================

/**
 * Fetch historical NAV data for a specific date
 * Uses get_funds_aum_snapshot for authoritative AUM
 */
export async function getHistoricalFlowData(targetDate: Date): Promise<Map<string, FlowData>> {
  const dateStr = targetDate.toISOString().split("T")[0];

  // Fetch authoritative AUM snapshot
  const { data: aumEntries, error: aumError } = await rpc.call("get_funds_aum_snapshot", {
    p_as_of_date: dateStr,
    p_purpose: "reporting",
  });

  if (aumError) {
    logError("dashboardMetrics.fetchAUMSnapshot", aumError);
    return new Map();
  }

  // Fetch accurate daily flows
  const { data: flowStats, error: flowError } = await rpc.call("get_funds_daily_flows", {
    p_date: dateStr,
  });

  if (flowError) {
    logError("dashboardMetrics.fetchDailyFlows", flowError);
  }

  const flowMap = new Map<string, FlowData>();
  const flows = (flowStats || {}) as Record<string, any>;

  for (const row of aumEntries || []) {
    const fundFlow = flows[row.fund_id] || {};
    flowMap.set(row.fund_id, {
      fund_id: row.fund_id,
      daily_inflows: Number(fundFlow.daily_inflows || 0),
      daily_outflows: Number(fundFlow.daily_outflows || 0),
      net_flow_24h: Number(fundFlow.net_flow_24h || 0),
      aum: Number(row.aum_value || 0),
    });
  }

  return flowMap;
}

/**
 * Fetch investor composition for a fund
 * Includes all account types (investor, fees_account, ib) with current_value > 0
 */
export async function getFundInvestorComposition(fundId: string): Promise<InvestorComposition[]> {
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select(
      `
      current_value,
      profile:profiles!fk_investor_positions_investor(first_name, last_name, email, account_type)
    `
    )
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  if (error) throw error;

  const allPositions = (positions as PositionWithProfile[] | null) || [];
  const totalValue = allPositions
    .reduce((sum, p) => sum.plus(parseFinancial(p.current_value)), parseFinancial(0))
    .toNumber();

  return allPositions.map((p) => ({
    investor_name:
      `${p.profile?.first_name || ""} ${p.profile?.last_name || ""}`.trim() ||
      p.profile?.email ||
      "Unknown",
    email: p.profile?.email || "",
    balance: p.current_value || 0,
    ownership_pct: totalValue > 0 ? ((p.current_value || 0) / totalValue) * 100 : 0,
    account_type: p.profile?.account_type || "investor",
  }));
}

// ============================================================================
// Delivery Status Functions
// ============================================================================

/**
 * Fetch delivery status records for a statement
 */
export async function getDeliveryStatus(
  statementId: string,
  investorId?: string,
  periodId?: string
): Promise<DeliveryRecord[]> {
  let query = supabase
    .from("statement_email_delivery")
    .select(
      "id, status, recipient_email, channel, attempt_count, last_attempt_at, sent_at, failed_at, error_message, created_at"
    )
    .order("created_at", { ascending: false });

  if (statementId) {
    query = query.eq("statement_id", statementId);
  } else if (investorId && periodId) {
    query = query.eq("investor_id", investorId).eq("period_id", periodId);
  }

  const { data, error } = await query.limit(5);
  if (error) throw error;
  return data as DeliveryRecord[];
}

/**
 * Retry a failed delivery
 */
export async function retryDelivery(deliveryId: string): Promise<void> {
  const { error } = await rpc.call("retry_delivery", {
    p_delivery_id: deliveryId,
  });
  if (error) throw error;
}

// ============================================================================
// Delivery Diagnostics Functions
// ============================================================================

/**
 * Get delivery diagnostics for a period
 * Uses authoritative server-side RPC for scalability
 */
export async function getDeliveryDiagnostics(periodId: string): Promise<DeliveryDiagnostics> {
  const { data, error } = await rpc.call("get_period_delivery_stats", {
    p_period_id: periodId,
  });

  if (error) {
    logError("dashboardMetrics.fetchDeliveryDiagnostics", error);
    throw error;
  }

  const stats = data as any;

  return {
    statements_generated: stats.statementsGenerated || 0,
    investors_with_statements: stats.investorsWithStatements || 0,
    investors_with_email: stats.investorsWithEmail || 0,
    investors_missing_email: stats.investorsMissingEmail || 0,
    deliveries_queued: stats.deliveriesQueued || 0,
    deliveries_sent: stats.deliveriesSent || 0,
    deliveries_failed: stats.deliveriesFailed || 0,
    already_delivered: stats.alreadyDelivered || 0,
    missing_email_names: stats.missingEmailNames || [],
  };
}

/**
 * Get delivery exclusion breakdown for a period
 */
export async function getDeliveryExclusionBreakdown(periodId: string): Promise<ExclusionBreakdown> {
  const { data, error } = await rpc.call("get_period_delivery_stats", {
    p_period_id: periodId,
  });

  if (error) {
    logError("dashboardMetrics.fetchExclusionBreakdown", error);
    return {
      totalInvestors: 0,
      statementsGenerated: 0,
      eligibleForDelivery: 0,
      alreadySent: 0,
      queued: 0,
      failed: 0,
      skipped: 0,
      missingEmail: 0,
      noStatement: 0,
      cancelled: 0,
    };
  }

  const stats = data as any;
  const noStatement = Math.max(0, (stats.totalInvestors || 0) - (stats.statementsGenerated || 0));
  const eligibleForDelivery = Math.max(
    0,
    (stats.statementsGenerated || 0) -
      (stats.deliveriesSent || 0) -
      (stats.investorsMissingEmail || 0)
  );

  return {
    totalInvestors: stats.totalInvestors || 0,
    statementsGenerated: stats.statementsGenerated || 0,
    eligibleForDelivery,
    alreadySent: stats.deliveriesSent || 0,
    queued: stats.deliveriesQueued || 0,
    failed: stats.deliveriesFailed || 0,
    skipped: stats.skipped || 0,
    missingEmail: stats.investorsMissingEmail || 0,
    noStatement,
    cancelled: 0, // Not explicitly tracked in simple RPC, but can be added if needed
  };
}
