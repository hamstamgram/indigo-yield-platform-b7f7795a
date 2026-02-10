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

// Import FundRef from canonical source
import type { FundRef } from "@/types/domains/fund";

// Note: Fund should be imported from @/types/domains/fund
// Using FundRef for backward compatibility in this service

export interface FeesOverviewData {
  fees: FeeRecord[];
  feeSummaries: FeeSummary[];
  funds: FundRef[];
  indigoFeesBalance: Record<string, number>;
  feeAllocations: FeeAllocation[];
  yieldEarned: YieldEarned[];
}

// ==================== Service Functions ====================

/**
 * Load all active funds
 */
export async function getActiveFunds(): Promise<FundRef[]> {
  const { data, error } = await supabase
    .from("funds")
    .select("id, code, name, asset")
    .eq("status", "active")
    .order("code")
    .limit(100);

  if (error) throw error;
  return data || [];
}

/**
 * Load fee-related transactions with investor and fund details
 */
export async function getFeeTransactions(): Promise<FeeRecord[]> {
  const { data: feeTxData, error: feeTxError } = await supabase
    .from("transactions_v2")
    .select(
      `
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
    `
    )
    .in("type", ["FEE", "FEE_CREDIT", "IB_CREDIT", "INTERNAL_WITHDRAWAL", "INTERNAL_CREDIT"])
    .eq("is_voided", false)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (feeTxError) throw feeTxError;

  if (!feeTxData || feeTxData.length === 0) {
    return [];
  }

  // Enrich with investor and fund details
  const investorIds = [
    ...new Set(feeTxData.map((t) => t.investor_id).filter((id): id is string => Boolean(id))),
  ];
  const fundIds = [
    ...new Set(feeTxData.map((t) => t.fund_id).filter((id): id is string => Boolean(id))),
  ];

  const [investorResult, fundResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .in("id", investorIds.length > 0 ? investorIds : [""])
      .limit(500),
    supabase
      .from("funds")
      .select("id, name, asset")
      .in("id", fundIds.length > 0 ? fundIds : [""])
      .limit(100),
  ]);

  const investorMap = new Map((investorResult.data ?? []).map((p) => [p.id, p]));
  const fundMap = new Map((fundResult.data ?? []).map((f) => [f.id, f]));

  return feeTxData.map((tx) => {
    const investor = investorMap.get(tx.investor_id);
    const fund = fundMap.get(tx.fund_id);
    return {
      id: tx.id,
      investorId: tx.investor_id,
      investorName: investor
        ? `${investor.first_name ?? ""} ${investor.last_name ?? ""}`.trim() || investor.email
        : "Unknown",
      investorEmail: investor?.email ?? "",
      fundId: tx.fund_id,
      fundName: fund?.name ?? "Unknown",
      asset: tx.asset ?? fund?.asset ?? "",
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
  // First get positions for INDIGO FEES account
  const { data: indigoPositions, error: posError } = await supabase
    .from("investor_positions")
    .select("fund_id, current_value")
    .eq("investor_id", INDIGO_FEES_ACCOUNT_ID)
    .limit(100);

  if (posError) throw posError;

  if (!indigoPositions || indigoPositions.length === 0) {
    return {};
  }

  // Get fund assets separately to avoid FK ambiguity
  const fundIds = indigoPositions.map((p) => p.fund_id);
  const { data: fundsData, error: fundsError } = await supabase
    .from("funds")
    .select("id, asset")
    .in("id", fundIds)
    .limit(100);

  if (fundsError) throw fundsError;

  const fundAssetMap = new Map((fundsData || []).map((f) => [f.id, f.asset]));

  const balances: Record<string, number> = {};
  indigoPositions.forEach((p) => {
    const asset = fundAssetMap.get(p.fund_id);
    if (asset) {
      balances[asset] = (balances[asset] || 0) + Number(p.current_value || 0);
    }
  });
  return balances;
}

/**
 * Load fee allocations (audit trail) from platform_fee_ledger
 * This table contains the actual fee records created during yield distributions
 */
export async function getFeeAllocations(): Promise<FeeAllocation[]> {
  // Query platform_fee_ledger which has the actual fee records
  const { data: ledgerData, error } = await supabase
    .from("platform_fee_ledger")
    .select(
      `
      id,
      yield_distribution_id,
      fund_id,
      investor_id,
      investor_name,
      gross_yield_amount,
      fee_percentage,
      fee_amount,
      effective_date,
      asset,
      created_at,
      is_voided
    `
    )
    .eq("is_voided", false)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  if (!ledgerData || ledgerData.length === 0) {
    return [];
  }

  // Enrich with investor emails and fund names
  const investorIds = [
    ...new Set(ledgerData.map((a) => a.investor_id).filter((id): id is string => Boolean(id))),
  ];
  const fundIds = [
    ...new Set(ledgerData.map((a) => a.fund_id).filter((id): id is string => Boolean(id))),
  ];

  const [profileResult, fundResult, distributionResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .in("id", investorIds)
      .limit(500),
    supabase.from("funds").select("id, name, asset").in("id", fundIds).limit(100),
    supabase
      .from("yield_distributions")
      .select("id, period_start, period_end, purpose")
      .in("id", ledgerData.map((l) => l.yield_distribution_id).filter(Boolean))
      .limit(500),
  ]);

  const profileMap = new Map((profileResult.data || []).map((p) => [p.id, p]));
  const fundMap = new Map((fundResult.data || []).map((f) => [f.id, f]));
  const distributionMap = new Map((distributionResult.data || []).map((d) => [d.id, d]));

  return ledgerData.map((a) => {
    const profile = profileMap.get(a.investor_id);
    const fund = fundMap.get(a.fund_id);
    const distribution = distributionMap.get(a.yield_distribution_id);
    return {
      id: a.id,
      distribution_id: a.yield_distribution_id || "",
      fund_id: a.fund_id,
      investor_id: a.investor_id,
      period_start: distribution?.period_start || a.effective_date,
      period_end: distribution?.period_end || a.effective_date,
      purpose: distribution?.purpose || "reporting",
      base_net_income: Number(a.gross_yield_amount || 0),
      fee_percentage: Number(a.fee_percentage || 0),
      fee_amount: Number(a.fee_amount || 0),
      created_at: a.created_at,
      investor_name:
        a.investor_name || profile
          ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.email
          : "Unknown",
      investor_email: profile?.email || "",
      fund_name: fund?.name || "Unknown",
      fund_asset: a.asset || fund?.asset || "",
    };
  });
}

/**
 * Load yield earned by INDIGO FEES account
 * Note: Yield transactions can be type YIELD or INTEREST
 */
export async function getYieldEarned(funds: FundRef[]): Promise<YieldEarned[]> {
  const { data: yieldTxs, error } = await supabase
    .from("transactions_v2")
    .select("fund_id, amount, type")
    .eq("investor_id", INDIGO_FEES_ACCOUNT_ID)
    .in("type", ["YIELD", "FEE_CREDIT", "IB_CREDIT"])
    .eq("is_voided", false)
    .limit(500);

  if (error) throw error;

  if (!yieldTxs || yieldTxs.length === 0) {
    return [];
  }

  const yieldByFund = new Map<string, { total: number; count: number }>();
  yieldTxs.forEach((tx) => {
    const existing = yieldByFund.get(tx.fund_id) || { total: 0, count: 0 };
    existing.total += Number(tx.amount || 0);
    existing.count += 1;
    yieldByFund.set(tx.fund_id, existing);
  });

  const yieldData: YieldEarned[] = [];
  yieldByFund.forEach((data, fundId) => {
    const fund = funds.find((f) => f.id === fundId);
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
  const [fees, indigoFeesBalance, feeAllocations, yieldEarned] = await Promise.all([
    getFeeTransactions(),
    getIndigoFeesBalance(),
    getFeeAllocations(),
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
  };
}
