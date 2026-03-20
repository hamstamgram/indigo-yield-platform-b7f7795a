/**
 * Investor Detail Service
 * Handles data fetching for investor management page
 */

import { supabase } from "@/integrations/supabase/client";
import { batchMapProcess } from "@/utils/batchHelper";
import { parseFinancial } from "@/utils/financial";

export interface InvestorDetailData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  created_at: string | null;
  profile_id: string;
  phone: string | null;
  ib_parent_id: string | null;
}

export interface OpsIndicators {
  lastActivityDate: string | null;
  lastReportPeriod: string | null;
  pendingWithdrawals: number;
  ibParentName: string | null;
  hasFeeSchedule: boolean;
}

/**
 * Position data for investor detail view
 * This is a simpler type than the full InvestorPosition
 */
export interface InvestorPosition {
  fund_id: string;
  fund_name: string;
  fund_code: string;
  asset: string;
  current_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  realized_pnl: number;
}

export interface InvestorPositionsData {
  positions: InvestorPosition[];
  totalValue: number;
}

/**
 * Fetch investor details by ID
 */
export async function fetchInvestorDetail(investorId: string): Promise<InvestorDetailData | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", investorId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();

  return {
    id: data.id,
    name: fullName,
    firstName: data.first_name || "",
    lastName: data.last_name || "",
    email: data.email,
    status: data.status || "active",
    created_at: data.created_at,
    profile_id: data.id,
    phone: data.phone || null,
    ib_parent_id: data.ib_parent_id || null,
  };
}

/**
 * Load operational indicators for an investor
 */
export async function loadOpsIndicators(
  investorId: string,
  ibParentId: string | null
): Promise<OpsIndicators> {
  // Fetch last transaction
  const { data: lastTx } = await supabase
    .from("transactions_v2")
    .select("tx_date")
    .eq("investor_id", investorId)
    .eq("is_voided", false)
    .order("tx_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch pending withdrawals
  const { count: pendingCount } = await supabase
    .from("withdrawal_requests")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", investorId)
    .eq("status", "pending");

  // Fetch last report with period name
  const { data: lastReport } = await supabase
    .from("generated_statements")
    .select("period_id, statement_periods!inner(period_name)")
    .eq("investor_id", investorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch IB parent name
  let ibParentName: string | null = null;
  if (ibParentId) {
    const { data: parentProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", ibParentId)
      .maybeSingle();
    if (parentProfile) {
      ibParentName =
        [parentProfile.first_name, parentProfile.last_name].filter(Boolean).join(" ") || null;
    }
  }

  // Check fee schedule
  const { data: feeSchedule } = await supabase
    .from("investor_fee_schedule")
    .select("id")
    .eq("investor_id", investorId)
    .limit(1);

  return {
    lastActivityDate: lastTx?.tx_date || null,
    lastReportPeriod: lastReport?.statement_periods?.period_name || null,
    pendingWithdrawals: pendingCount || 0,
    ibParentName,
    hasFeeSchedule: (feeSchedule?.length || 0) > 0,
  };
}

/**
 * Fetch investor positions with fund details and computed totals
 * Used by admin investor detail views
 * Filters out zero-value positions
 */
export async function fetchInvestorPositionsWithTotals(
  investorId: string
): Promise<InvestorPositionsData> {
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select(
      `
      fund_id,
      current_value,
      cost_basis,
      unrealized_pnl,
      realized_pnl,
      funds!fk_investor_positions_fund(name, code, asset)
    `
    )
    .eq("investor_id", investorId)
    .or("current_value.gt.0,cost_basis.gt.0")
    .limit(100);

  if (error) throw error;

  const mappedPositions: InvestorPosition[] = (positions || []).map((p: any) => ({
    fund_id: p.fund_id,
    fund_name: p.funds?.name || "Unknown",
    fund_code: p.funds?.code || "",
    asset: p.funds?.asset || "",
    current_value: parseFinancial(p.current_value || 0).toNumber(),
    cost_basis: parseFinancial(p.cost_basis || 0).toNumber(),
    unrealized_pnl: parseFinancial(p.unrealized_pnl || 0).toNumber(),
    realized_pnl: parseFinancial(p.realized_pnl || 0).toNumber(),
  }));

  const totalValue = mappedPositions.reduce((sum, p) => sum + p.current_value, 0);

  return {
    positions: mappedPositions,
    totalValue,
  };
}

/**
 * Fetch investor active positions (positions with current_value > 0)
 * Used for delete confirmation
 */
export async function fetchActivePositions(investorId: string): Promise<InvestorPosition[]> {
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select(
      `
      fund_id,
      current_value,
      cost_basis,
      unrealized_pnl,
      realized_pnl,
      funds!fk_investor_positions_fund(name, code, asset)
    `
    )
    .eq("investor_id", investorId)
    .gt("current_value", 0)
    .limit(100);

  if (error) throw error;

  return (positions || []).map((p: any) => ({
    fund_id: p.fund_id,
    fund_name: p.funds?.name || "Unknown",
    fund_code: p.funds?.code || "",
    asset: p.funds?.asset || "",
    current_value: parseFinancial(p.current_value || 0).toNumber(),
    cost_basis: parseFinancial(p.cost_basis || 0).toNumber(),
    unrealized_pnl: parseFinancial(p.unrealized_pnl || 0).toNumber(),
    realized_pnl: parseFinancial(p.realized_pnl || 0).toNumber(),
  }));
}

/**
 * Batch fetch pending withdrawal counts for multiple investors
 */
export async function getPendingWithdrawalCountsBatch(
  investorIds: string[]
): Promise<Map<string, number>> {
  if (investorIds.length === 0) return new Map();

  return batchMapProcess(investorIds, 50, async (batchIds) => {
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select("investor_id")
      .in("investor_id", batchIds)
      .eq("status", "pending");

    if (error) throw error;

    const counts = new Map<string, number>();
    (data || []).forEach((w) => {
      if (w.investor_id) {
        counts.set(w.investor_id, (counts.get(w.investor_id) || 0) + 1);
      }
    });
    return counts;
  });
}

/**
 * Batch fetch last report periods for multiple investors
 */
export async function getLastReportPeriodsBatch(
  investorIds: string[]
): Promise<Map<string, string>> {
  if (investorIds.length === 0) return new Map();

  return batchMapProcess(investorIds, 50, async (batchIds) => {
    const { data, error } = await supabase
      .from("generated_statements")
      .select("investor_id, period_id, created_at, statement_periods!period_id(period_name)")
      .in("investor_id", batchIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const lastReports = new Map<string, string>();
    (data || []).forEach((r: any) => {
      // Only keep first (most recent) report per investor
      if (!lastReports.has(r.investor_id)) {
        const periodName = r.statement_periods?.period_name;
        lastReports.set(r.investor_id, periodName || r.period_id);
      }
    });
    return lastReports;
  });
}

export const investorDetailService = {
  fetchInvestorDetail,
  loadOpsIndicators,
  fetchInvestorPositionsWithTotals,
  fetchActivePositions,
  getPendingWithdrawalCountsBatch,
  getLastReportPeriodsBatch,
};
