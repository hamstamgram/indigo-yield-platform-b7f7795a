/**
 * Yield Management Service
 * Provides void/edit operations for yield records with full audit trail
 */

import { supabase } from "@/integrations/supabase/client";
import { logError, logWarn } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { rpc } from "@/lib/rpc/index";

export interface VoidYieldResult {
  success: boolean;
  fund_id: string;
  aum_date: string;
  purpose: string;
  voided_at: string;
}

export interface UpdateYieldResult {
  success: boolean;
  record_id: string;
  old_aum: number;
  new_aum: number;
  updated_at: string;
}

/**
 * RPC result type for update_fund_daily_aum_with_recalc
 */
interface RecalcYieldRPCResult {
  success: boolean;
  error?: string;
  record_id?: string;
  old_aum?: number;
  new_aum?: number;
  updated_at?: string;
}

/**
 * RPC result type for get_void_aum_impact
 */
export interface VoidAumImpactResult {
  success: boolean;
  error?: string;
  record_id?: string;
  fund_id?: string;
  fund_name?: string;
  fund_asset?: string;
  aum_date?: string;
  total_aum?: number;
  purpose?: string;
  distributions_to_void?: number;
  transactions_to_void?: number;
  affected_investors?: Array<{
    investor_id: string;
    investor_name: string;
    current_position: number;
    yield_amount: number;
    fee_amount: number;
  }>;
  affected_investor_count?: number;
  total_yield_amount?: number;
  total_fee_amount?: number;
}

export interface YieldDetails {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_asset: string;
  aum_date: string;
  total_aum: number;
  purpose: string;
  is_month_end: boolean;
  source: string | null;
  is_voided: boolean;
  voided_at: string | null;
  voided_by: string | null;
  voided_by_name?: string;
  void_reason: string | null;
  created_at: string;
  created_by: string | null;
  created_by_name?: string;
  updated_at: string | null;
  updated_by: string | null;
  updated_by_name?: string;
}

// voidYieldRecord: REMOVED (deprecated -- use void_yield_distribution RPC)

/**
 * Void a yield distribution by distribution ID (cascade void with audit trail)
 * Use this when voiding a specific distribution from YieldDistributionsPage
 */
export async function voidYieldDistribution(
  distributionId: string,
  reason: string,
  voidCrystals: boolean = false
): Promise<{ success: boolean; voided_count?: number; voided_crystals?: number; error?: string }> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await callRPC("void_yield_distribution", {
    p_distribution_id: distributionId,
    p_admin_id: user.id,
    p_reason: reason,
    p_void_crystals: voidCrystals,
  });

  if (error) {
    logError("yieldManagement.voidDistribution", error, { distributionId });
    throw new Error(error.message || "Failed to void yield distribution");
  }

  const result = data as Record<string, unknown>;
  const voidedCount = Number(result.voided_count ?? 0);
  const voidedCrystals = Number(result.voided_crystals ?? 0);

  if (voidedCount === 0) {
    logWarn("voidYieldDistribution.noCascade", {
      distributionId,
      message: "Yield voided but no allocations were cascaded — verify fee/ib allocations manually",
    });
  }

  return {
    success: Boolean(result.success),
    voided_count: voidedCount,
    voided_crystals: voidedCrystals,
    error: result.error as string | undefined,
  };
}

// unvoidYieldDistribution: REMOVED (RPC was removed)

// updateYieldAum: REMOVED (deprecated -- fund_daily_aum table was dropped)

/**
 * Get detailed information about a yield record
 * @deprecated Querying yield_distributions instead for historical context.
 */
export async function getYieldDetails(recordId: string): Promise<YieldDetails | null> {
  const { data: record, error } = await supabase
    .from("yield_distributions")
    .select(
      "id, fund_id, aum_date:effective_date, total_aum:recorded_aum, is_month_end, is_voided, voided_at, void_reason, created_at, created_by"
    )
    .eq("id", recordId)
    .maybeSingle();

  if (error || !record) {
    return null;
  }

  // Get fund details
  const { data: fund } = await supabase
    .from("funds")
    .select("name, asset")
    .eq("id", (record as any).fund_id)
    .maybeSingle();

  return {
    id: record.id,
    fund_id: (record as any).fund_id,
    fund_name: fund?.name || "Unknown Fund",
    fund_asset: fund?.asset || "Unknown",
    aum_date: (record as any).aum_date,
    total_aum: (record as any).total_aum,
    purpose: "reporting",
    is_month_end: record.is_month_end || false,
    source: "yield_distribution",
    is_voided: record.is_voided || false,
    voided_at: record.voided_at,
    voided_by: null,
    void_reason: record.void_reason,
    created_at: record.created_at,
    created_by: record.created_by,
    updated_at: null,
    updated_by: null,
  };
}

/**
 * Check if a yield record can be voided
 * Returns { canVoid: boolean, reason?: string }
 */
export async function canVoidYieldRecord(
  recordId: string
): Promise<{ canVoid: boolean; reason?: string }> {
  const details = await getYieldDetails(recordId);

  if (!details) {
    return { canVoid: false, reason: "Record not found" };
  }

  if (details.is_voided) {
    return { canVoid: false, reason: "Record is already voided" };
  }

  // Additional checks could be added here (e.g., check if there are dependent corrections)

  return { canVoid: true };
}

/**
 * Check if a yield record can be edited
 */
export async function canEditYieldRecord(
  recordId: string
): Promise<{ canEdit: boolean; reason?: string }> {
  const details = await getYieldDetails(recordId);

  if (!details) {
    return { canEdit: false, reason: "Record not found" };
  }

  if (details.is_voided) {
    return { canEdit: false, reason: "Cannot edit a voided record" };
  }

  return { canEdit: true };
}

/**
 * Get void impact preview
 * @deprecated fund_daily_aum table was dropped — this is now a no-op.
 */
export async function getYieldVoidImpact(_recordId: string): Promise<VoidAumImpactResult> {
  return { success: false } as any;
}
