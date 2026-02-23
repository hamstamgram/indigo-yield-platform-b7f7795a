/**
 * Dashboard Metrics Service
 *
 * Service layer for admin dashboard metrics and analytics.
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { parseFinancial } from "@/utils/financial";

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
  aum_source: string;
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
  const { data: transactions, error } = await supabase
    .from("transactions_v2")
    .select("amount, type, tx_date")
    .eq("is_voided", false) // Exclude voided transactions
    .limit(500);

  if (error) throw error;

  const totalDeposits =
    transactions
      ?.filter((t) => t.type === "DEPOSIT")
      .reduce((acc, t) => acc.plus(parseFinancial(t.amount)), parseFinancial(0))
      .toNumber() || 0;

  const totalWithdrawals =
    transactions
      ?.filter((t) => t.type === "WITHDRAWAL")
      .reduce((acc, t) => acc.plus(parseFinancial(t.amount)), parseFinancial(0))
      .toNumber() || 0;

  return {
    totalDeposits,
    totalWithdrawals,
    netFlow: totalDeposits - totalWithdrawals,
  };
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

  const { data, error } = await rpc.call("get_funds_aum_snapshot", {
    p_as_of_date: dateStr,
    p_purpose: "reporting",
  });

  if (error) {
    console.error("Error fetching historical AUM snapshot:", error);
    return new Map();
  }

  const flowMap = new Map<string, FlowData>();

  for (const row of data || []) {
    flowMap.set(row.fund_id, {
      fund_id: row.fund_id,
      daily_inflows: 0, // Placeholder as we prioritize AUM accuracy first
      daily_outflows: 0,
      net_flow_24h: 0,
      aum: Number(row.aum_value || 0),
      aum_source: row.aum_source,
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
 */
export async function getDeliveryDiagnostics(periodId: string): Promise<DeliveryDiagnostics> {
  // Fetch statements for period
  const { data: statements, error: stmtError } = await supabase
    .from("generated_statements")
    .select("id, investor_id")
    .eq("period_id", periodId)
    .limit(500);

  if (stmtError) throw stmtError;

  // Fetch profiles for investors with statements
  const investorIds = [...new Set(statements?.map((s) => s.investor_id) || [])];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", investorIds)
    .limit(500);

  if (profileError) throw profileError;

  // Create a map of investor_id -> profile
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  // Fetch delivery records for period
  const { data: deliveries, error: delError } = await supabase
    .from("statement_email_delivery")
    .select("id, investor_id, status, recipient_email")
    .eq("period_id", periodId)
    .limit(500);

  if (delError) throw delError;

  // Process data
  const investorsWithStatements = new Set(statements?.map((s) => s.investor_id) || []);

  const investorsWithEmail: string[] = [];
  const investorsMissingEmail: { id: string; name: string }[] = [];

  statements?.forEach((s) => {
    const profile = profileMap.get(s.investor_id);
    if (profile?.email) {
      investorsWithEmail.push(s.investor_id);
    } else {
      const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Unknown";
      investorsMissingEmail.push({ id: s.investor_id, name });
    }
  });

  const statusCounts = {
    queued: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
  };

  deliveries?.forEach((d) => {
    const status = d.status?.toLowerCase() || "queued";
    if (status === "queued") statusCounts.queued++;
    else if (status === "sent" || status === "delivered") statusCounts.sent++;
    else if (status === "failed" || status === "bounced") statusCounts.failed++;
  });

  return {
    statements_generated: statements?.length || 0,
    investors_with_statements: investorsWithStatements.size,
    investors_with_email: investorsWithEmail.length,
    investors_missing_email: investorsMissingEmail.length,
    deliveries_queued: statusCounts.queued,
    deliveries_sent: statusCounts.sent + statusCounts.delivered,
    deliveries_failed: statusCounts.failed,
    already_delivered: statusCounts.delivered,
    missing_email_names: investorsMissingEmail.map((i) => i.name),
  };
}

// ============================================================================
// Delivery Exclusion Stats Functions
// ============================================================================

/**
 * Get delivery exclusion breakdown for a period
 */
export async function getDeliveryExclusionBreakdown(periodId: string): Promise<ExclusionBreakdown> {
  // 1. Get total investor count (active investors)
  const investorResult = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .match({ account_type: "investor", status: "active" });
  const totalInvestors = investorResult.count ?? 0;

  // 2. Get statements generated for this period
  const statementResult = await supabase
    .from("generated_statements")
    .select("id", { count: "exact", head: true })
    .match({ period_id: periodId });
  const statementsGenerated = statementResult.count ?? 0;

  // 3. Get delivery statuses breakdown
  const { data: deliveryData } = await supabase
    .from("statement_email_delivery")
    .select("status, error_message")
    .eq("period_id", periodId)
    .limit(500);

  const deliveries = deliveryData || [];

  // Count by status
  const statusCounts = {
    queued: 0,
    sending: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
    bounced: 0,
    complained: 0,
  };

  let missingEmail = 0;

  deliveries.forEach((d) => {
    const status = d.status?.toLowerCase() || "unknown";
    if (status in statusCounts) {
      statusCounts[status as keyof typeof statusCounts]++;
    }
    // Track missing email specifically
    if (status === "skipped" && d.error_message === "missing_email") {
      missingEmail++;
    }
  });

  // Calculate derived values
  const alreadySent = statusCounts.sent + statusCounts.delivered;
  const noStatement = (totalInvestors || 0) - (statementsGenerated || 0);
  const eligibleForDelivery =
    (statementsGenerated || 0) - alreadySent - missingEmail - statusCounts.cancelled;

  return {
    totalInvestors: totalInvestors || 0,
    statementsGenerated: statementsGenerated || 0,
    eligibleForDelivery: Math.max(0, eligibleForDelivery),
    alreadySent,
    queued: statusCounts.queued + statusCounts.sending,
    failed: statusCounts.failed + statusCounts.bounced + statusCounts.complained,
    skipped: statusCounts.skipped,
    missingEmail,
    noStatement: Math.max(0, noStatement),
    cancelled: statusCounts.cancelled,
  };
}
