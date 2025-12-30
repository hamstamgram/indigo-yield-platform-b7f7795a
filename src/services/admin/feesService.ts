/**
 * Admin Fees Service
 * Handles fee overview data fetching, INDIGO FEES account, allocations, and routing audit
 */

import { supabase } from "@/integrations/supabase/client";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";

// ==================== Types ====================

export interface FeeRecord {
  id: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  fundId: string;
  fundName: string;
  asset: string;
  amount: number;
  type: string;
  txDate: string;
  purpose: string;
  visibilityScope: string;
  createdAt: string;
}

export interface FeeSummary {
  assetCode: string;
  totalAmount: number;
  transactionCount: number;
}

export interface FeeAllocation {
  id: string;
  distribution_id: string;
  fund_id: string;
  investor_id: string;
  period_start: string;
  period_end: string;
  purpose: string;
  base_net_income: number;
  fee_percentage: number;
  fee_amount: number;
  created_at: string;
  investor_name?: string;
  investor_email?: string;
  fund_name?: string;
  fund_asset?: string;
}

export interface YieldEarned {
  fundId: string;
  fundName: string;
  asset: string;
  totalYieldEarned: number;
  transactionCount: number;
}

export interface RoutingAuditEntry {
  id: string;
  action: string;
  actor_user: string | null;
  created_at: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  actor_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface RoutingSummary {
  totalAmount: number;
  totalCount: number;
  byAsset: Record<string, { amount: number; count: number }>;
}

export interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

export interface FeesOverviewData {
  fees: FeeRecord[];
  feeSummaries: FeeSummary[];
  funds: Fund[];
  indigoFeesBalance: Record<string, number>;
  feeAllocations: FeeAllocation[];
  yieldEarned: YieldEarned[];
  routingAuditEntries: RoutingAuditEntry[];
  routingSummary: RoutingSummary;
}

// ==================== Service Functions ====================

/**
 * Load all active funds
 */
export async function getActiveFunds(): Promise<Fund[]> {
  const { data, error } = await supabase
    .from("funds")
    .select("id, code, name, asset")
    .eq("status", "active")
    .order("code");

  if (error) throw error;
  return data || [];
}

/**
 * Load fee-related transactions with investor and fund details
 */
export async function getFeeTransactions(): Promise<FeeRecord[]> {
  const { data: feeTxData, error: feeTxError } = await supabase
    .from("transactions_v2")
    .select(`
      id,
      investor_id,
      fund_id,
      asset,
      amount,
      type,
      tx_date,
      purpose,
      visibility_scope,
      created_at,
      is_voided
    `)
    .in("type", ["FEE", "FEE_CREDIT", "IB_CREDIT", "INTERNAL_WITHDRAWAL", "INTERNAL_CREDIT"])
    .eq("is_voided", false)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (feeTxError) throw feeTxError;

  if (!feeTxData || feeTxData.length === 0) {
    return [];
  }

  // Enrich with investor and fund details
  const investorIds = [...new Set(feeTxData.map(t => t.investor_id))];
  const fundIds = [...new Set(feeTxData.map(t => t.fund_id))];

  const [investorResult, fundResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .in("id", investorIds),
    supabase
      .from("funds")
      .select("id, name, asset")
      .in("id", fundIds),
  ]);

  const investorMap = new Map((investorResult.data || []).map(p => [p.id, p]));
  const fundMap = new Map((fundResult.data || []).map(f => [f.id, f]));

  return feeTxData.map((tx) => {
    const investor = investorMap.get(tx.investor_id);
    const fund = fundMap.get(tx.fund_id);
    return {
      id: tx.id,
      investorId: tx.investor_id,
      investorName: investor
        ? `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || investor.email
        : "Unknown",
      investorEmail: investor?.email || "",
      fundId: tx.fund_id,
      fundName: fund?.name || "Unknown",
      asset: tx.asset || fund?.asset || "",
      amount: Number(tx.amount),
      type: tx.type,
      txDate: tx.tx_date,
      purpose: tx.purpose || "",
      visibilityScope: tx.visibility_scope || "",
      createdAt: tx.created_at,
    };
  });
}

/**
 * Calculate fee summaries by asset from fee records
 */
export function calculateFeeSummaries(fees: FeeRecord[]): FeeSummary[] {
  const summaryMap = new Map<string, FeeSummary>();
  fees.forEach((fee) => {
    const existing = summaryMap.get(fee.asset) || {
      assetCode: fee.asset,
      totalAmount: 0,
      transactionCount: 0,
    };
    existing.totalAmount += fee.amount;
    existing.transactionCount += 1;
    summaryMap.set(fee.asset, existing);
  });
  return Array.from(summaryMap.values());
}

/**
 * Get INDIGO FEES account balances by asset
 */
export async function getIndigoFeesBalance(): Promise<Record<string, number>> {
  const { data: indigoPositions, error } = await supabase
    .from("investor_positions")
    .select("fund_id, current_value, funds!inner(asset)")
    .eq("investor_id", INDIGO_FEES_ACCOUNT_ID);

  if (error) throw error;

  const balances: Record<string, number> = {};
  (indigoPositions || []).forEach((p: any) => {
    const asset = p.funds?.asset;
    if (asset) {
      balances[asset] = (balances[asset] || 0) + Number(p.current_value || 0);
    }
  });
  return balances;
}

/**
 * Load fee allocations (audit trail) with investor and fund enrichment
 */
export async function getFeeAllocations(): Promise<FeeAllocation[]> {
  const { data: allocationsData, error } = await supabase
    .from("fee_allocations")
    .select(`
      id,
      distribution_id,
      fund_id,
      investor_id,
      period_start,
      period_end,
      purpose,
      base_net_income,
      fee_percentage,
      fee_amount,
      created_at
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  if (!allocationsData || allocationsData.length === 0) {
    return [];
  }

  // Enrich with investor and fund names
  const investorIds = [...new Set(allocationsData.map(a => a.investor_id))];
  const fundIds = [...new Set(allocationsData.map(a => a.fund_id))];

  const [profileResult, fundResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .in("id", investorIds),
    supabase
      .from("funds")
      .select("id, name, asset")
      .in("id", fundIds),
  ]);

  const profileMap = new Map((profileResult.data || []).map(p => [p.id, p]));
  const fundMap = new Map((fundResult.data || []).map(f => [f.id, f]));

  return allocationsData.map(a => {
    const profile = profileMap.get(a.investor_id);
    const fund = fundMap.get(a.fund_id);
    return {
      ...a,
      investor_name: profile 
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email 
        : "Unknown",
      investor_email: profile?.email || "",
      fund_name: fund?.name || "Unknown",
      fund_asset: fund?.asset || "",
    };
  });
}

/**
 * Load routing audit entries for route_to_fees actions
 */
export async function getRoutingAuditEntries(): Promise<{
  entries: RoutingAuditEntry[];
  summary: RoutingSummary;
}> {
  const { data: routingAuditData, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("action", "route_to_fees")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.warn("Could not load routing audit entries:", error);
    return {
      entries: [],
      summary: { totalAmount: 0, totalCount: 0, byAsset: {} },
    };
  }

  if (!routingAuditData || routingAuditData.length === 0) {
    return {
      entries: [],
      summary: { totalAmount: 0, totalCount: 0, byAsset: {} },
    };
  }

  // Enrich with actor profiles
  const actorIds = [...new Set(routingAuditData.map(r => r.actor_user).filter(Boolean))];
  
  const { data: actorProfiles } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("id", actorIds);

  const actorMap = new Map((actorProfiles || []).map(p => [p.id, p]));

  const enrichedEntries: RoutingAuditEntry[] = routingAuditData.map((entry: any) => ({
    id: entry.id,
    action: entry.action,
    actor_user: entry.actor_user,
    created_at: entry.created_at,
    entity_id: entry.entity_id,
    old_values: entry.old_values,
    new_values: entry.new_values,
    meta: entry.meta,
    actor_profile: entry.actor_user ? actorMap.get(entry.actor_user) : null,
  }));

  // Calculate routing summary
  const summary: RoutingSummary = {
    totalAmount: 0,
    totalCount: enrichedEntries.length,
    byAsset: {},
  };

  enrichedEntries.forEach((entry) => {
    const meta = (entry.meta || {}) as Record<string, unknown>;
    const newValues = (entry.new_values || {}) as Record<string, unknown>;
    const amount = Number(meta.amount || newValues.amount || 0);
    const asset = (meta.asset_code as string) || (newValues.asset_code as string) || "USDT";

    summary.totalAmount += amount;

    if (!summary.byAsset[asset]) {
      summary.byAsset[asset] = { amount: 0, count: 0 };
    }
    summary.byAsset[asset].amount += amount;
    summary.byAsset[asset].count += 1;
  });

  return { entries: enrichedEntries, summary };
}

/**
 * Load yield earned by INDIGO FEES account
 */
export async function getYieldEarned(funds: Fund[]): Promise<YieldEarned[]> {
  const { data: yieldTxs, error } = await supabase
    .from("transactions_v2")
    .select("fund_id, amount, type")
    .eq("investor_id", INDIGO_FEES_ACCOUNT_ID)
    .eq("type", "INTEREST")
    .eq("is_voided", false);

  if (error) throw error;

  if (!yieldTxs || yieldTxs.length === 0) {
    return [];
  }

  const yieldByFund = new Map<string, { total: number; count: number }>();
  yieldTxs.forEach(tx => {
    const existing = yieldByFund.get(tx.fund_id) || { total: 0, count: 0 };
    existing.total += Number(tx.amount || 0);
    existing.count += 1;
    yieldByFund.set(tx.fund_id, existing);
  });

  const yieldData: YieldEarned[] = [];
  yieldByFund.forEach((data, fundId) => {
    const fund = funds.find(f => f.id === fundId);
    if (fund) {
      yieldData.push({
        fundId,
        fundName: fund.name,
        asset: fund.asset,
        totalYieldEarned: data.total,
        transactionCount: data.count,
      });
    }
  });

  return yieldData;
}

/**
 * Load all fees overview data in parallel
 */
export async function getFeesOverviewData(): Promise<FeesOverviewData> {
  // Load funds first (needed for yield calculation)
  const funds = await getActiveFunds();

  // Load remaining data in parallel
  const [
    fees,
    indigoFeesBalance,
    feeAllocations,
    routingData,
    yieldEarned,
  ] = await Promise.all([
    getFeeTransactions(),
    getIndigoFeesBalance(),
    getFeeAllocations(),
    getRoutingAuditEntries(),
    getYieldEarned(funds),
  ]);

  const feeSummaries = calculateFeeSummaries(fees);

  return {
    fees,
    feeSummaries,
    funds,
    indigoFeesBalance,
    feeAllocations,
    yieldEarned,
    routingAuditEntries: routingData.entries,
    routingSummary: routingData.summary,
  };
}
