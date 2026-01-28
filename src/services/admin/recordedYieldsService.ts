/**
 * Recorded Yields Service
 * Provides CRUD operations for yield records with audit logging
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { db } from "@/lib/db/index";

export type AumPurpose = "reporting" | "transaction";

export interface YieldRecord {
  id: string;
  fund_id: string;
  fund_name?: string;
  fund_asset?: string;
  aum_date: string;
  as_of_date?: string;
  total_aum: number;
  nav_per_share?: number | null;
  total_shares?: number | null;
  is_month_end: boolean;
  purpose: AumPurpose;
  source?: string | null;
  created_at: string;
  created_by?: string | null;
  created_by_name?: string;
  updated_at?: string;
  is_voided: boolean;
  voided_at?: string | null;
  void_reason?: string | null;
}

export interface YieldFilters {
  fundId?: string;
  dateFrom?: string;
  dateTo?: string;
  purpose?: AumPurpose | "all";
  isMonthEnd?: boolean;
}

export interface UpdateYieldRecordInput {
  total_aum?: number;
  aum_date?: string;
  as_of_date?: string;
  purpose?: AumPurpose;
  is_month_end?: boolean;
  source?: string;
}

/**
 * Fetch all yield records with optional filters
 */
/**
 * Fetch all yield records with optional filters
 * Performance: Limited to 1000 rows to prevent timeouts on large datasets
 */
export async function getYieldRecords(filters: YieldFilters = {}): Promise<YieldRecord[]> {
  let query = supabase
    .from("fund_daily_aum")
    .select(
      `
      id,
      fund_id,
      aum_date,
      as_of_date,
      total_aum,
      nav_per_share,
      total_shares,
      is_month_end,
      purpose,
      source,
      created_at,
      created_by,
      updated_at,
      is_voided,
      voided_at,
      void_reason
    `
    )
    .eq("is_voided", false)
    .order("aum_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000); // P1 fix: Prevent timeout for large datasets

  if (filters.fundId && filters.fundId !== "all") {
    query = query.eq("fund_id", filters.fundId);
  }

  if (filters.dateFrom) {
    query = query.gte("aum_date", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("aum_date", filters.dateTo);
  }

  if (filters.purpose && filters.purpose !== "all") {
    query = query.eq("purpose", filters.purpose);
  }

  if (filters.isMonthEnd !== undefined) {
    query = query.eq("is_month_end", filters.isMonthEnd);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching yield records:", error);
    throw new Error(`Failed to fetch yield records: ${error.message}`);
  }

  // Fetch fund details and creator names
  const records = data || [];
  const fundIds = [...new Set(records.map((r) => r.fund_id))];
  const creatorIds = [...new Set(records.filter((r) => r.created_by).map((r) => r.created_by!))];

  // Get fund names
  const { data: funds } = await supabase
    .from("funds")
    .select("id, name, asset")
    .in("id", fundIds.length > 0 ? fundIds : ["00000000-0000-0000-0000-000000000000"]);

  const fundMap = new Map((funds || []).map((f) => [f.id, { name: f.name, asset: f.asset }]));

  // Get creator names
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", creatorIds.length > 0 ? creatorIds : ["00000000-0000-0000-0000-000000000000"]);

  const profileMap = new Map(
    (profiles || []).map((p) => [
      p.id,
      `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || "Unknown",
    ])
  );

  return records.map((r) => ({
    ...r,
    fund_name: fundMap.get(r.fund_id)?.name || r.fund_id,
    fund_asset: fundMap.get(r.fund_id)?.asset || "Unknown",
    created_by_name: r.created_by ? profileMap.get(r.created_by) || "Unknown" : undefined,
    purpose: r.purpose as AumPurpose,
  }));
}

/**
 * Update a yield record with audit logging
 * Only Super Admins can edit yields
 */
export async function updateYieldRecord(
  recordId: string,
  updates: UpdateYieldRecordInput,
  adminId: string,
  editReason?: string
): Promise<YieldRecord> {
  // First, check if user is super admin
  const { data: isSuperAdmin, error: rpcError } = await rpc.callNoArgs("is_super_admin");
  if (rpcError || !isSuperAdmin) {
    throw new Error("Only Super Admins can edit yield records");
  }

  // Get current record values for audit
  const { data: current, error: fetchError } = await supabase
    .from("fund_daily_aum")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();

  if (fetchError || !current) {
    throw new Error("Yield record not found");
  }

  // Log the edit to audit table
  const auditResult = await db.insert("yield_edit_audit", {
    record_id: recordId,
    record_type: "fund_daily_aum",
    edited_by: adminId,
    previous_values: current,
    new_values: { ...current, ...updates },
    edit_reason: editReason,
  });

  if (auditResult.error) {
    console.error("Error logging yield edit:", auditResult.error);
    // Don't throw - audit should not block updates
  }

  // Apply the update
  const { data: updated, error: updateError } = await supabase
    .from("fund_daily_aum")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId)
    .select()
    .maybeSingle();

  if (updateError) {
    throw new Error(`Failed to update yield record: ${updateError.message}`);
  }

  return updated as YieldRecord;
}

/**
 * Get yield edit history for a specific record
 */
export async function getYieldEditHistory(recordId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("yield_edit_audit")
    .select(
      `
      *,
      editor:profiles!fk_yield_edit_audit_editor_profile(first_name, last_name, email)
    `
    )
    .eq("record_id", recordId)
    .order("edited_at", { ascending: false });

  if (error) {
    console.error("Error fetching yield edit history:", error);
    throw new Error(`Failed to fetch edit history: ${error.message}`);
  }

  return data || [];
}

/**
 * Check if current user is a Super Admin (can edit yields)
 */
export async function canEditYields(): Promise<boolean> {
  const { data, error } = await rpc.callNoArgs("is_super_admin");
  if (error) {
    console.error("Error checking super admin status:", error);
    return false;
  }
  return !!data;
}

/**
 * Get yield records filtered for investor view (only finalized/reporting purpose)
 */
export async function getInvestorVisibleAUM(
  fundId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<YieldRecord[]> {
  let query = supabase
    .from("fund_daily_aum")
    .select("*")
    .eq("purpose", "reporting")
    .eq("is_month_end", true)
    .eq("is_voided", false)
    .order("aum_date", { ascending: false })
    .limit(500);

  if (fundId) {
    query = query.eq("fund_id", fundId);
  }

  if (dateFrom) {
    query = query.gte("aum_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("aum_date", dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching investor visible AUM:", error);
    throw new Error(`Failed to fetch AUM: ${error.message}`);
  }

  return (data || []) as YieldRecord[];
}

/**
 * Get the last finalized AUM date for a fund
 */
export async function getLastFinalizedAUMDate(fundId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("fund_daily_aum")
    .select("aum_date")
    .eq("fund_id", fundId)
    .eq("purpose", "reporting")
    .eq("is_month_end", true)
    .eq("is_voided", false)
    .order("aum_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.aum_date;
}
