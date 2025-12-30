/**
 * Typed RPC wrapper for Supabase
 * Eliminates (supabase.rpc as any) usage for known RPCs
 */
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// RPC Type Definitions for v3 Yield RPCs
// ============================================================================

export interface YieldV3PreviewArgs {
  p_fund_id: string;
  p_as_of_date: string;
  p_new_total_aum: number;
  p_purpose?: string;
  p_notes?: string | null;
}

export interface YieldV3Response {
  success: boolean;
  error?: string;
  code?: string;
  preview?: boolean;
  fund_id?: string;
  fund_name?: string;
  fund_code?: string;
  fund_asset?: string;
  effective_date?: string;
  purpose?: string;
  notes?: string;
  current_aum?: number;
  new_aum?: number;
  gross_yield?: number;
  total_gross?: number;
  total_fees?: number;
  total_ib?: number;
  total_net?: number;
  platform_fees?: number;
  indigo_fees_credit?: number;
  indigo_fees_id?: string;
  investor_count?: number;
  investors?: Array<{
    investor_id: string;
    investor_name: string;
    account_type?: string;
    current_value: number;
    allocation_pct: number;
    fee_pct: number;
    gross_yield: number;
    fee_amount: number;
    ib_amount: number;
    ib_source?: string;
    net_yield: number;
    ib_parent_id?: string;
    ib_parent_name?: string;
    ib_percentage: number;
    new_balance: number;
    position_delta: number;
    reference_id: string;
    would_skip: boolean;
  }>;
  ib_credits?: Array<{
    ib_investor_id: string;
    ib_investor_name: string;
    source_investor_id: string;
    source_investor_name: string;
    amount: number;
    ib_percentage: number;
    source: string;
    reference_id: string;
    would_skip: boolean;
  }>;
  existing_conflicts?: string[];
  has_conflicts?: boolean;
  status?: string;
  distribution_id?: string;
  created_count?: number;
  skipped_count?: number;
}

export interface BatchTransactionRequest {
  investor_id: string;
  fund_id: string;
  type?: string;
  amount: number;
  tx_date?: string;
  notes?: string;
  reference_id: string;
}

export interface BatchTransactionResponse {
  success: boolean;
  error?: string;
  code?: string;
  created_count?: number;
  skipped_count?: number;
  results?: Array<{
    reference_id: string;
    status: string;
    reason?: string;
    transaction_id?: string;
  }>;
}

// ============================================================================
// Typed RPC Functions
// ============================================================================

/**
 * Preview yield distribution v3 - server calculates gross yield
 */
export async function previewYieldV3(
  args: YieldV3PreviewArgs
): Promise<{ data: YieldV3Response | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("preview_daily_yield_to_fund_v3", {
    p_fund_id: args.p_fund_id,
    p_as_of_date: args.p_as_of_date,
    p_new_total_aum: args.p_new_total_aum,
    p_purpose: args.p_purpose || "reporting",
    p_notes: args.p_notes || null,
  } as any);
  return { data: data as unknown as YieldV3Response | null, error };
}

/**
 * Apply yield distribution v3 - server calculates gross yield
 */
export async function applyYieldV3(
  args: YieldV3PreviewArgs
): Promise<{ data: YieldV3Response | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("apply_daily_yield_to_fund_v3", {
    p_fund_id: args.p_fund_id,
    p_as_of_date: args.p_as_of_date,
    p_new_total_aum: args.p_new_total_aum,
    p_purpose: args.p_purpose || "reporting",
    p_notes: args.p_notes || null,
  } as any);
  return { data: data as unknown as YieldV3Response | null, error };
}

/**
 * Batch create transactions - for investor wizard
 */
export async function createTransactionsBatch(
  requests: BatchTransactionRequest[]
): Promise<{ data: BatchTransactionResponse | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("admin_create_transactions_batch", {
    p_requests: requests,
  } as any);
  return { data: data as unknown as BatchTransactionResponse | null, error };
}
