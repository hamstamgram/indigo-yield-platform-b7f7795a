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
// Month Closure RPC Types
// ============================================================================

export interface MonthClosureStatusArgs {
  p_fund_id: string;
  p_month_start: string;
}

export interface MonthClosureStatusResponse {
  is_closed: boolean;
  closure_id?: string;
  fund_id: string;
  month_start: string;
  month_end?: string;
  closed_at?: string;
  closed_by?: string;
  notes?: string;
}

export interface CloseMonthArgs {
  p_fund_id: string;
  p_month_start: string;
  p_effective_date: string;
  p_admin_id: string;
  p_notes?: string | null;
}

export interface CloseMonthResponse {
  success: boolean;
  error?: string;
  closure_id?: string;
  month_start?: string;
  month_end?: string;
  closed_at?: string;
}

export interface ReopenMonthArgs {
  p_fund_id: string;
  p_month_start: string;
  p_admin_id: string;
  p_reason?: string | null;
}

export interface ReopenMonthResponse {
  success: boolean;
  error?: string;
  closure_id?: string;
  month_start?: string;
}

// ============================================================================
// AUM RPC Types
// ============================================================================

export interface FundWithAUM {
  fund_id: string;
  fund_code: string;
  fund_name: string;
  asset: string;
  fund_class: string;
  status: string;
  total_aum: number;
  investor_count: number;
}

export interface MonthlyAUMRecord {
  month: string;
  total_aum: number;
  fund_count: number;
}

// ============================================================================
// Position Adjustment RPC Types
// ============================================================================

export interface AdjustPositionArgs {
  p_investor_id: string;
  p_fund_id: string;
  p_delta: number;
  p_note: string;
  p_admin_id: string | null;
  p_tx_type: string;
  p_tx_date: string;
  p_reference_id: string;
}

export interface AdjustPositionResponse {
  out_success: boolean;
  out_message: string;
  out_transaction_id: string;
  out_new_balance: number;
}

// ============================================================================
// Yield Management RPC Types
// ============================================================================

export interface VoidAumArgs {
  p_record_id: string;
  p_reason: string;
  p_admin_id: string;
}

export interface VoidAumResponse {
  success: boolean;
  fund_id: string;
  aum_date: string;
  purpose: string;
  voided_at: string;
}

export interface UpdateAumArgs {
  p_record_id: string;
  p_new_total_aum: number;
  p_reason: string;
  p_admin_id: string;
}

export interface UpdateAumResponse {
  success: boolean;
  record_id: string;
  old_aum: number;
  new_aum: number;
  updated_at: string;
}

// ============================================================================
// Typed RPC Functions - Yield V3
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

// ============================================================================
// Typed RPC Functions - Month Closure
// ============================================================================

/**
 * Get month closure status for a fund
 */
export async function getMonthClosureStatus(
  args: MonthClosureStatusArgs
): Promise<{ data: MonthClosureStatusResponse | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("get_month_closure_status", {
    p_fund_id: args.p_fund_id,
    p_month_start: args.p_month_start,
  } as any);
  return { data: data as unknown as MonthClosureStatusResponse | null, error };
}

/**
 * Close a fund's reporting month
 */
export async function closeReportingMonth(
  args: CloseMonthArgs
): Promise<{ data: CloseMonthResponse | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("close_fund_reporting_month", {
    p_fund_id: args.p_fund_id,
    p_month_start: args.p_month_start,
    p_effective_date: args.p_effective_date,
    p_admin_id: args.p_admin_id,
    p_notes: args.p_notes || null,
  } as any);
  return { data: data as unknown as CloseMonthResponse | null, error };
}

/**
 * Reopen a fund's reporting month
 */
export async function reopenReportingMonth(
  args: ReopenMonthArgs
): Promise<{ data: ReopenMonthResponse | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("reopen_fund_reporting_month", {
    p_fund_id: args.p_fund_id,
    p_month_start: args.p_month_start,
    p_admin_id: args.p_admin_id,
    p_reason: args.p_reason || null,
  } as any);
  return { data: data as unknown as ReopenMonthResponse | null, error };
}

// ============================================================================
// Typed RPC Functions - AUM
// ============================================================================

/**
 * Get all funds with their current AUM
 */
export async function getFundsWithAum(): Promise<{ data: FundWithAUM[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("get_funds_with_aum") as any;
  return { data: data as FundWithAUM[] | null, error };
}

/**
 * Get monthly platform AUM
 */
export async function getMonthlyPlatformAum(): Promise<{ data: MonthlyAUMRecord[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("get_monthly_platform_aum") as any;
  return { data: data as MonthlyAUMRecord[] | null, error };
}

// ============================================================================
// Typed RPC Functions - Position Adjustment
// ============================================================================

/**
 * Adjust investor position (atomic transaction + position update)
 */
export async function adjustInvestorPosition(
  args: AdjustPositionArgs
): Promise<{ data: AdjustPositionResponse[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("adjust_investor_position", {
    p_investor_id: args.p_investor_id,
    p_fund_id: args.p_fund_id,
    p_delta: args.p_delta,
    p_note: args.p_note,
    p_admin_id: args.p_admin_id,
    p_tx_type: args.p_tx_type,
    p_tx_date: args.p_tx_date,
    p_reference_id: args.p_reference_id,
  } as any);
  return { data: data as unknown as AdjustPositionResponse[] | null, error };
}

// ============================================================================
// Typed RPC Functions - Yield Management
// ============================================================================

/**
 * Void a fund daily AUM record
 */
export async function voidFundDailyAum(
  args: VoidAumArgs
): Promise<{ data: VoidAumResponse | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("void_fund_daily_aum", {
    p_record_id: args.p_record_id,
    p_reason: args.p_reason,
    p_admin_id: args.p_admin_id,
  } as any);
  return { data: data as unknown as VoidAumResponse | null, error };
}

/**
 * Update a fund daily AUM record
 */
export async function updateFundDailyAum(
  args: UpdateAumArgs
): Promise<{ data: UpdateAumResponse | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("update_fund_daily_aum", {
    p_record_id: args.p_record_id,
    p_new_total_aum: args.p_new_total_aum,
    p_reason: args.p_reason,
    p_admin_id: args.p_admin_id,
  } as any);
  return { data: data as unknown as UpdateAumResponse | null, error };
}

// ============================================================================
// Typed RPC Functions - Recompute Position
// ============================================================================

export interface RecomputePositionArgs {
  p_investor_id: string;
  p_fund_id: string;
}

/**
 * Recompute a single investor's position from ledger
 */
export async function recomputeInvestorPosition(
  args: RecomputePositionArgs
): Promise<{ data: null; error: Error | null }> {
  const { error } = await supabase.rpc("recompute_investor_position", {
    p_investor_id: args.p_investor_id,
    p_fund_id: args.p_fund_id,
  } as any);
  return { data: null, error };
}

// ============================================================================
// Typed RPC Functions - Reconcile Positions
// ============================================================================

export interface ReconcilePositionsArgs {
  p_dry_run: boolean;
}

export interface PositionMismatch {
  investor_id: string;
  investor_name: string;
  fund_id: string;
  fund_name: string;
  old_shares: number;
  new_shares: number;
  old_value: number;
  new_value: number;
  action: string;
}

/**
 * Reconcile all positions from ledger (admin only)
 */
export async function reconcileAllPositions(
  args: ReconcilePositionsArgs
): Promise<{ data: PositionMismatch[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("reconcile_all_positions", {
    p_dry_run: args.p_dry_run,
  } as any);
  return { data: data as PositionMismatch[] | null, error };
}
