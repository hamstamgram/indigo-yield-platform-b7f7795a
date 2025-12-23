/**
 * Yield Management Service
 * Provides void/edit operations for yield records with full audit trail
 */

import { supabase } from "@/integrations/supabase/client";

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
 * Void a yield record (soft delete with audit trail)
 */
export async function voidYieldRecord(
  recordId: string,
  reason: string
): Promise<VoidYieldResult> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await (supabase.rpc as any)("void_fund_daily_aum", {
    p_record_id: recordId,
    p_reason: reason,
    p_admin_id: user.id,
  });

  if (error) {
    console.error("Error voiding yield record:", error);
    throw new Error(error.message || "Failed to void yield record");
  }

  return data as VoidYieldResult;
}

/**
 * Update a yield record's AUM with audit trail
 */
export async function updateYieldAum(
  recordId: string,
  newTotalAum: number,
  reason: string
): Promise<UpdateYieldResult> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await (supabase.rpc as any)("update_fund_daily_aum", {
    p_record_id: recordId,
    p_new_total_aum: newTotalAum,
    p_reason: reason,
    p_admin_id: user.id,
  });

  if (error) {
    console.error("Error updating yield record:", error);
    throw new Error(error.message || "Failed to update yield record");
  }

  return data as UpdateYieldResult;
}

/**
 * Get detailed information about a yield record
 */
export async function getYieldDetails(recordId: string): Promise<YieldDetails | null> {
  const { data: record, error } = await supabase
    .from("fund_daily_aum")
    .select("*")
    .eq("id", recordId)
    .single();

  if (error || !record) {
    console.error("Error fetching yield details:", error);
    return null;
  }

  // Get fund details
  const { data: fund } = await supabase
    .from("funds")
    .select("name, asset")
    .eq("id", record.fund_id)
    .single();

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
export async function canVoidYieldRecord(recordId: string): Promise<{ canVoid: boolean; reason?: string }> {
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
export async function canEditYieldRecord(recordId: string): Promise<{ canEdit: boolean; reason?: string }> {
  const details = await getYieldDetails(recordId);
  
  if (!details) {
    return { canEdit: false, reason: "Record not found" };
  }

  if (details.is_voided) {
    return { canEdit: false, reason: "Cannot edit a voided record" };
  }

  return { canEdit: true };
}
