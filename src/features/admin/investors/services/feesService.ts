/**
 * Admin Fees Service
 * Handles fee overview data fetching, INDIGO FEES account, allocations, and routing audit
 */

import { supabase } from "@/integrations/supabase/client";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";
import { getActiveFunds } from "@/features/admin/funds/services/fundService";
import { parseFinancial } from "@/utils/financial";

// ==================== Types ====================

export interface FeeRecord {
  id: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  fundId: string;
  fundName: string;
  asset: string;
  /** Fee amount - string for NUMERIC(28,10) precision */
  amount: string;
  type: string;
  txDate: string;
  purpose: string;
  visibilityScope: string;
  notes?: string;
  createdAt: string;
}

export interface FeeSummary {
  assetCode: string;
  /** Total amount - string for NUMERIC(28,10) precision */
  totalAmount: string;
  transactionCount: number;
}

/**
 * Platform fee ledger entry (from platform_fee_ledger table)
 * NOTE: Renamed from FeeAllocation to avoid conflict with canonical
 * FeeAllocation type from @/types/domains/feeAllocation.ts
 */
export interface PlatformFeeLedgerEntry {
  id: string;
  distribution_id: string;
  fund_id: string;
  investor_id: string;
  period_start: string;
  period_end: string;
  purpose: string;
  /** Base net income - string for NUMERIC(28,10) precision */
  base_net_income: string;
  /** Fee percentage - string for decimal precision */
  fee_percentage: string;
  /** Fee amount - string for NUMERIC(28,10) precision */
  fee_amount: string;
  created_at: string;
  investor_name?: string;
  investor_email?: string;
  fund_name?: string;
  fund_asset?: string;
}

/** @deprecated Use PlatformFeeLedgerEntry instead */
export type FeeAllocation = PlatformFeeLedgerEntry;

export interface YieldEarned {
  fundId: string;
  fundName: string;
  asset: string;
  /** Total yield earned - string for NUMERIC(28,10) precision */
  totalYieldEarned: string;
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
  /** Balance per asset - string values for NUMERIC precision */
  indigoFeesBalance: Record<string, string>;
  feeAllocations: PlatformFeeLedgerEntry[];
  yieldEarned: YieldEarned[];
}

// ==================== Service Functions ====================

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
      notes,
      created_at,
      is_voided,
      fee_allocations!credit_transaction_id(
        investor_id
      )
    `
    )
    .or(
      `type.in.(FEE_CREDIT,IB_CREDIT,YIELD,DUST,DUST_SWEEP,INTERNAL_CREDIT),investor_id.eq.${INDIGO_FEES_ACCOUNT_ID}`
    )
    .eq("is_voided", false)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (feeTxError) throw feeTxError;

  if (!feeTxData || feeTxData.length === 0) {
    return [];
  }

  // Extract all relevant IDs for enrichment
  const investorIds = [
    ...new Set(feeTxData.map((t) => t.investor_id).filter((id): id is string => Boolean(id))),
  ];

  // Also collect IDs from fee allocations if they differ (though usually transactions_v2 investor_id is the recipient, not the source)
  feeTxData.forEach((tx: any) => {
    const allocation = tx.fee_allocations?.[0];
    if (allocation?.investor_id) {
      investorIds.push(allocation.investor_id);
    }
  });

  const fundIds = [
    ...new Set(feeTxData.map((t) => t.fund_id).filter((id): id is string => Boolean(id))),
  ];

  const [investorResult, fundResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .in("id", [...new Set(investorIds)].length > 0 ? [...new Set(investorIds)] : [""])
      .limit(2000),
    supabase
      .from("funds")
      .select("id, name, asset")
      .in("id", fundIds.length > 0 ? fundIds : [""])
      .limit(100),
  ]);

  const investorMap = new Map((investorResult.data ?? []).map((p) => [p.id, p]));
  const fundMap = new Map((fundResult.data ?? []).map((f) => [f.id, f]));

  return feeTxData.map((tx: any) => {
    const allocation = tx.fee_allocations?.[0];
    const sourceInvestorId = allocation?.investor_id;

    // For fee credits, we want to show who PAID the fee, not who RECEIVED it (Indigo Fees)
    const effectiveInvestorId =
      tx.type === "FEE_CREDIT" && sourceInvestorId ? sourceInvestorId : tx.investor_id;

    const investor = investorMap.get(effectiveInvestorId);
    const fund = fundMap.get(tx.fund_id);

    return {
      id: tx.id,
      investorId: effectiveInvestorId,
      investorName: investor
        ? `${investor.first_name ?? ""} ${investor.last_name ?? ""}`.trim() || investor.email
        : "Unknown",
      investorEmail: investor?.email ?? "",
      fundId: tx.fund_id,
      fundName: fund?.name ?? "Unknown",
      asset: tx.asset ?? fund?.asset ?? "",
      amount: String(tx.amount),
      type: tx.type,
      txDate: tx.tx_date,
      purpose: tx.purpose || "",
      visibilityScope: tx.visibility_scope || "",
      notes: tx.notes || "",
      createdAt: tx.created_at,
    };
  });
}

/**
 * Calculate fee summaries by asset from fee records
 */
export function calculateFeeSummaries(fees: FeeRecord[]): FeeSummary[] {
  const summaryMap = new Map<
    string,
    { assetCode: string; total: ReturnType<typeof parseFinancial>; count: number }
  >();
  fees.forEach((fee) => {
    const existing = summaryMap.get(fee.asset) || {
      assetCode: fee.asset,
      total: parseFinancial(0),
      count: 0,
    };
    existing.total = existing.total.plus(parseFinancial(fee.amount));
    existing.count += 1;
    summaryMap.set(fee.asset, existing);
  });
  return Array.from(summaryMap.values()).map(({ assetCode, total, count }) => ({
    assetCode,
    totalAmount: total.toFixed(10),
    transactionCount: count,
  }));
}

/**
 * Get INDIGO FEES account balances by asset
 */
export async function getIndigoFeesBalance(): Promise<Record<string, string>> {
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

  const balances: Record<string, ReturnType<typeof parseFinancial>> = {};
  indigoPositions.forEach((p) => {
    const asset = fundAssetMap.get(p.fund_id);
    if (asset) {
      const current = balances[asset] || parseFinancial(0);
      balances[asset] = current.plus(parseFinancial(p.current_value || 0));
    }
  });

  const result: Record<string, string> = {};
  for (const [asset, value] of Object.entries(balances)) {
    result[asset] = value.toFixed(10);
  }
  return result;
}

/**
 * Load fee allocations (audit trail) from fee_allocations
 * This table contains the actual fee records created during yield distributions (V5)
 */
export async function getFeeAllocations(): Promise<PlatformFeeLedgerEntry[]> {
  // Query fee_allocations — the table V5 yield distribution actually writes to
  const { data: ledgerData, error } = await supabase
    .from("fee_allocations")
    .select(
      `
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
      created_at,
      is_voided
    `
    )
    .eq("is_voided", false)
    .neq("purpose", "transaction")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw error;

  if (!ledgerData || ledgerData.length === 0) {
    return [];
  }

  // Enrich with investor names/emails and fund names
  const investorIds = [
    ...new Set(ledgerData.map((a) => a.investor_id).filter((id): id is string => Boolean(id))),
  ];
  const fundIds = [
    ...new Set(ledgerData.map((a) => a.fund_id).filter((id): id is string => Boolean(id))),
  ];

  const [profileResult, fundResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .in("id", investorIds)
      .limit(2000),
    supabase.from("funds").select("id, name, asset").in("id", fundIds).limit(100),
  ]);

  const profileMap = new Map((profileResult.data || []).map((p) => [p.id, p]));
  const fundMap = new Map((fundResult.data || []).map((f) => [f.id, f]));

  return ledgerData.map((a) => {
    const profile = profileMap.get(a.investor_id);
    const fund = fundMap.get(a.fund_id);
    return {
      id: a.id,
      distribution_id: a.distribution_id || "",
      fund_id: a.fund_id,
      investor_id: a.investor_id,
      period_start: a.period_start,
      period_end: a.period_end,
      purpose: a.purpose || "reporting",
      base_net_income: String(a.base_net_income || 0),
      fee_percentage: String(a.fee_percentage || 0),
      fee_amount: String(a.fee_amount || 0),
      created_at: a.created_at,
      investor_name: profile
        ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.email
        : "Unknown",
      investor_email: profile?.email || "",
      fund_name: fund?.name || "Unknown",
      fund_asset: fund?.asset || "",
    };
  });
}

/**
 * Load fee revenue collected by INDIGO FEES account
 * Only includes FEE_CREDIT transactions from reporting-purpose distributions
 */
export async function getYieldEarned(funds: FundRef[]): Promise<YieldEarned[]> {
  const { data: yieldTxs, error } = await supabase
    .from("transactions_v2")
    .select("fund_id, amount, type")
    .eq("investor_id", INDIGO_FEES_ACCOUNT_ID)
    .in("type", ["FEE_CREDIT"])
    .eq("is_voided", false)
    .neq("purpose", "transaction")
    .limit(5000);

  if (error) throw error;

  if (!yieldTxs || yieldTxs.length === 0) {
    return [];
  }

  const yieldByFund = new Map<
    string,
    { total: ReturnType<typeof parseFinancial>; count: number }
  >();
  yieldTxs.forEach((tx) => {
    const existing = yieldByFund.get(tx.fund_id) || { total: parseFinancial(0), count: 0 };
    existing.total = existing.total.plus(parseFinancial(tx.amount || 0));
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
        totalYieldEarned: data.total.toFixed(10),
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
