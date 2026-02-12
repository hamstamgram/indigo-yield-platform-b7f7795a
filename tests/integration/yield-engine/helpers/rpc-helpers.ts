/**
 * RPC Helpers for Yield Engine Integration Tests
 *
 * Wrappers for calling yield-related Supabase RPCs (V5 segmented engine).
 */

import { supabase, registerTestDistribution } from "./supabase-client";

/** V5 preview allocation shape */
export interface PreviewAllocation {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  account_type: string;
  gross: number;
  fee_pct: number;
  fee: number;
  ib_parent_id: string | null;
  ib_rate: number;
  ib: number;
  net: number;
  segments: unknown[];
}

/** V5 preview return shape */
export interface YieldDistributionPreview {
  success: boolean;
  fund_id: string;
  fund_code: string;
  fund_asset: string;
  period_start: string;
  period_end: string;
  days_in_period: number;
  opening_aum: number;
  recorded_aum: number;
  total_yield: number;
  gross_yield: number;
  net_yield: number;
  total_fees: number;
  total_ib: number;
  dust_amount: number;
  investor_count: number;
  segment_count: number;
  crystal_count: number;
  segments: unknown[];
  allocations: PreviewAllocation[];
  conservation_check: boolean;
  calculation_method: string;
  features: string[];
}

/** V5 apply return shape */
export interface YieldDistributionResult {
  success: boolean;
  distribution_id: string;
  fund_id: string;
  fund_code: string;
  period_start: string;
  period_end: string;
  opening_aum: number;
  recorded_aum: number;
  gross_yield: number;
  net_yield: number;
  total_fees: number;
  total_ib: number;
  dust_amount: number;
  allocation_count: number;
  segment_count: number;
  crystals_consolidated: number;
  segments: unknown[];
  conservation_check: boolean;
  position_sum: number;
  position_aum_match: boolean;
  ib_auto_paid: boolean;
  features: string[];
}

/**
 * Preview a yield distribution without applying it (v5 API)
 */
export async function previewYieldDistribution(params: {
  fund_id: string;
  period_end: string;
  recorded_aum: string;
  purpose?: string;
}): Promise<YieldDistributionPreview> {
  const { data, error } = await supabase.rpc("preview_segmented_yield_distribution_v5", {
    p_fund_id: params.fund_id,
    p_period_end: params.period_end,
    p_recorded_aum: params.recorded_aum,
    p_purpose: params.purpose || "transaction",
  });

  if (error) throw new Error(`Preview failed: ${error.message}`);
  if (!data?.success) throw new Error(`Preview returned error: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Apply a yield distribution (v5 API) - uses test wrapper to bypass admin check
 */
export async function applyYieldDistribution(params: {
  fund_id: string;
  period_end: string;
  recorded_aum: string;
  admin_id: string;
  purpose?: string;
}): Promise<YieldDistributionResult> {
  const { data, error } = await supabase.rpc("test_apply_yield_distribution_v5", {
    p_fund_id: params.fund_id,
    p_period_end: params.period_end,
    p_recorded_aum: params.recorded_aum,
    p_admin_id: params.admin_id,
    p_purpose: params.purpose || "transaction",
  });

  if (error) throw new Error(`Apply distribution failed: ${error.message}`);
  if (!data?.success) throw new Error(`Apply returned error: ${JSON.stringify(data)}`);

  // Register for cleanup
  if (data?.distribution_id) {
    registerTestDistribution(data.distribution_id);
  }

  return data;
}

/**
 * Void a yield distribution
 */
export async function voidYieldDistribution(params: {
  distribution_id: string;
  admin_id?: string;
  reason?: string;
}): Promise<{ success: boolean; voided_transactions: number }> {
  const { data, error } = await supabase.rpc("void_yield_distribution", {
    p_distribution_id: params.distribution_id,
    p_admin_id: params.admin_id || null,
    p_reason: params.reason || "Test cleanup",
  });

  if (error) throw new Error(`Void distribution failed: ${error.message}`);
  return data;
}

/**
 * Apply a transaction with crystallization
 */
export async function applyTransactionWithCrystallization(params: {
  investor_id: string;
  fund_id: string;
  tx_type: "DEPOSIT" | "WITHDRAWAL";
  amount: string;
  tx_date: string;
  reference_id: string;
  notes?: string;
  admin_id?: string;
  new_total_aum?: string;
  purpose?: string;
  distribution_id?: string;
}): Promise<{
  transaction_id: string;
  crystallization_applied: boolean;
  crystallization_amount: string;
}> {
  const { data, error } = await supabase.rpc("test_apply_transaction_with_crystallization", {
    p_fund_id: params.fund_id,
    p_investor_id: params.investor_id,
    p_tx_type: params.tx_type,
    p_amount: params.amount,
    p_tx_date: params.tx_date,
    p_reference_id: params.reference_id,
    p_notes: params.notes || null,
    p_admin_id: params.admin_id || null,
    p_new_total_aum: params.new_total_aum || null,
    p_purpose: params.purpose || "transaction",
    p_distribution_id: params.distribution_id || null,
  });

  if (error) throw new Error(`Transaction failed: ${error.message}`);

  // Normalize response: real function returns tx_id/crystallized_yield_amount
  const crystalAmount = parseFloat(data?.crystallized_yield_amount ?? "0");
  return {
    transaction_id: data?.tx_id,
    crystallization_applied: crystalAmount > 0,
    crystallization_amount: String(crystalAmount),
  };
}

/**
 * Get yield allocations for a distribution
 */
export async function getYieldAllocations(distributionId: string): Promise<
  Array<{
    id: string;
    investor_id: string;
    distribution_id: string;
    gross_amount: string;
    fee_amount: string;
    ib_amount: string;
    net_amount: string;
    adb_share: string;
    is_voided: boolean;
    [key: string]: unknown;
  }>
> {
  const { data, error } = await supabase
    .from("yield_allocations")
    .select("*")
    .eq("distribution_id", distributionId)
    .order("gross_amount", { ascending: false });

  if (error) throw new Error(`Failed to get allocations: ${error.message}`);
  return data;
}

/**
 * Get fee allocations for a distribution
 */
export async function getFeeAllocations(distributionId: string): Promise<
  Array<{
    id: string;
    investor_id: string;
    fees_account_id: string;
    fee_amount: string;
    fee_percentage: string;
    distribution_id: string;
    is_voided: boolean;
    [key: string]: unknown;
  }>
> {
  const { data, error } = await supabase
    .from("fee_allocations")
    .select("*")
    .eq("distribution_id", distributionId);

  if (error) throw new Error(`Failed to get fee allocations: ${error.message}`);
  return data;
}

/**
 * Get IB allocations for a distribution
 */
export async function getIBAllocations(distributionId: string): Promise<
  Array<{
    id: string;
    source_investor_id: string;
    ib_investor_id: string;
    ib_fee_amount: string;
    distribution_id: string;
    is_voided: boolean;
    [key: string]: unknown;
  }>
> {
  const { data, error } = await supabase
    .from("ib_allocations")
    .select("*")
    .eq("distribution_id", distributionId);

  if (error) throw new Error(`Failed to get IB allocations: ${error.message}`);
  return data;
}

/**
 * Get investor position
 */
export async function getInvestorPosition(
  investorId: string,
  fundId: string
): Promise<{
  current_value: string;
  cost_basis: string;
  shares: string;
  is_active: boolean;
  [key: string]: unknown;
} | null> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select("*")
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .single();

  if (error?.code === "PGRST116") return null; // Not found
  if (error) throw new Error(`Failed to get position: ${error.message}`);
  return data;
}

/**
 * Get transactions for an investor
 */
export async function getInvestorTransactions(
  investorId: string,
  fundId: string
): Promise<
  Array<{
    id: string;
    type: string;
    amount: string;
    tx_date: string;
    reference_id: string;
    is_voided: boolean;
    [key: string]: unknown;
  }>
> {
  const { data, error } = await supabase
    .from("transactions_v2")
    .select("*")
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .order("tx_date", { ascending: true });

  if (error) throw new Error(`Failed to get transactions: ${error.message}`);
  return data;
}
