/**
 * Yield Management Service
 * Provides void/edit operations for yield records with full audit trail
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";

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

/**
 * Void a yield record by AUM record ID (soft delete with audit trail)
 * Use this when voiding from the RecordedYieldsPage (AUM perspective)
 */
export async function voidYieldRecord(recordId: string, reason: string): Promise<VoidYieldResult> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await callRPC("void_fund_daily_aum", {
    p_record_id: recordId,
    p_reason: reason,
    p_admin_id: user.id,
  });

  if (error) {
    logError("yieldManagement.voidRecord", error, { recordId });
    throw new Error(error.message || "Failed to void yield record");
  }

  return data as unknown as VoidYieldResult;
}

/**
 * Void a yield distribution by distribution ID (cascade void with audit trail)
 * Use this when voiding a specific distribution from YieldDistributionsPage
 */
export async function voidYieldDistribution(
  distributionId: string,
  reason: string
): Promise<{ success: boolean; voided_count?: number; error?: string }> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Canonical signature: void_yield_distribution(p_distribution_id, p_admin_id, p_reason)
  const { data, error } = await callRPC("void_yield_distribution", {
    p_distribution_id: distributionId,
    p_admin_id: user.id,
    p_reason: reason,
  });

  if (error) {
    logError("yieldManagement.voidDistribution", error, { distributionId });
    throw new Error(error.message || "Failed to void yield distribution");
  }

  return data as unknown as { success: boolean; voided_count?: number; error?: string };
}

/**
 * Update a yield record's AUM with audit trail
 */
/**
 * Update a yield record's AUM with full cascade recalculation
 * Voids existing yield distributions and re-applies with new AUM
 */
export async function updateYieldAum(
  recordId: string,
  newTotalAum: number,
  reason: string
): Promise<UpdateYieldResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Use the new recalc function that voids and re-applies
  const { data, error } = await callRPC("update_fund_daily_aum_with_recalc", {
    p_record_id: recordId,
    p_new_total_aum: newTotalAum,
    p_reason: reason,
    p_admin_id: user.id,
  });

  if (error) {
    logError("yieldManagement.updateAum", error, { recordId, newTotalAum });
    throw new Error(error.message || "Failed to update yield record");
  }

  const result = data as unknown as RecalcYieldRPCResult;
  if (!result?.success) {
    throw new Error(result?.error || "Failed to recalculate yield");
  }

  return {
    success: true,
    record_id: result.record_id,
    old_aum: result.old_aum,
    new_aum: result.new_aum,
    updated_at: result.updated_at,
  };
}

/**
 * Get detailed information about a yield record
 */
export async function getYieldDetails(recordId: string): Promise<YieldDetails | null> {
  const { data: record, error } = await supabase
    .from("fund_daily_aum")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();

  if (error || !record) {
    logError("yieldManagement.getDetails", error, { recordId });
    return null;
  }

  // Get fund details
  const { data: fund } = await supabase
    .from("funds")
    .select("name, asset")
    .eq("id", record.fund_id)
    .maybeSingle();

  // Get user names for created_by, voided_by, updated_by
  const userIds = [record.created_by, record.voided_by, record.updated_by].filter(Boolean);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const profileMap = new Map(
    (profiles || []).map((p) => [
      p.id,
      `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || "Unknown",
    ])
  );

  return {
    id: record.id,
    fund_id: record.fund_id,
    fund_name: fund?.name || "Unknown Fund",
    fund_asset: fund?.asset || "Unknown",
    aum_date: record.aum_date,
    total_aum: record.total_aum,
    purpose: record.purpose,
    is_month_end: record.is_month_end,
    source: record.source,
    is_voided: record.is_voided || false,
    voided_at: record.voided_at,
    voided_by: record.voided_by,
    voided_by_name: record.voided_by ? profileMap.get(record.voided_by) : undefined,
    void_reason: record.void_reason,
    created_at: record.created_at,
    created_by: record.created_by,
    created_by_name: record.created_by ? profileMap.get(record.created_by) : undefined,
    updated_at: record.updated_at,
    updated_by: record.updated_by,
    updated_by_name: record.updated_by ? profileMap.get(record.updated_by) : undefined,
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
 * Get void impact preview for a fund_daily_aum record
 * Shows what will happen before voiding (distributions, transactions, investors affected)
 */
export async function getYieldVoidImpact(recordId: string): Promise<VoidAumImpactResult> {
  // Use the correct RPC that accepts fund_daily_aum record ID
  // Note: get_void_aum_impact may not be in generated types yet - using direct rpc call
  const { data, error } = await supabase.rpc("get_void_aum_impact" as never, {
    p_record_id: recordId,
  } as never);

  if (error) {
    logError("yieldManagement.getVoidImpact", error, { recordId });
    throw new Error(error.message || "Failed to get yield void impact");
  }

  return data as unknown as VoidAumImpactResult;
}
