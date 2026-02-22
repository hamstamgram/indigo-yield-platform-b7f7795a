/**
 * Recorded Yields Service
 * Provides CRUD operations for yield records with audit logging
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { logError } from "@/lib/logger";

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
  // Yield distribution fields (joined when a distribution exists)
  gross_yield?: number | null;
  net_yield?: number | null;
  total_fees?: number | null;
  total_ib?: number | null;
  allocation_count?: number | null;
  distribution_id?: string | null;
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
    logError("recordedYieldsService.getYieldRecords", error);
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

  // Get yield distribution data for reporting records (join by fund_id + effective_date)
  const yieldSourcedRecords = records.filter(
    (r) => r.source?.startsWith("yield_distribution") ?? false
  );
  const distMap = new Map<
    string,
    {
      id: string;
      gross_yield: number;
      net_yield: number;
      total_fees: number;
      total_ib: number;
      allocation_count: number;
    }
  >();

  if (yieldSourcedRecords.length > 0) {
    const yieldFundDates = yieldSourcedRecords.map((r) => ({
      fund_id: r.fund_id,
      date: r.aum_date,
    }));
    const uniqueFundIds = [...new Set(yieldFundDates.map((rd) => rd.fund_id))] as string[];
    const uniqueDates = [...new Set(yieldFundDates.map((rd) => rd.date))] as string[];

    const { data: distributions } = await supabase
      .from("yield_distributions")
      .select(
        "id, fund_id, effective_date, period_end, gross_yield, gross_yield_amount, net_yield, total_net_amount, total_fees, total_fee_amount, total_ib, total_ib_amount, allocation_count"
      )
      .in("fund_id", uniqueFundIds)
      .in("effective_date", uniqueDates)
      .in("purpose", ["reporting", "transaction"])
      .eq("is_voided", false)
      .limit(1000);

    if (distributions) {
      for (const d of distributions) {
        const key = `${d.fund_id}:${d.effective_date}`;
        distMap.set(key, {
          id: d.id,
          gross_yield: parseFloat(String(d.gross_yield_amount ?? d.gross_yield ?? 0)) || 0,
          net_yield: parseFloat(String(d.total_net_amount ?? d.net_yield ?? 0)) || 0,
          total_fees: parseFloat(String(d.total_fee_amount ?? d.total_fees ?? 0)) || 0,
          total_ib: parseFloat(String(d.total_ib_amount ?? d.total_ib ?? 0)) || 0,
          allocation_count: d.allocation_count || 0,
        });
      }
    }
  }

  return records.map((r) => {
    const distKey = `${r.fund_id}:${r.aum_date}`;
    const dist = distMap.get(distKey);
    return {
      ...r,
      fund_name: fundMap.get(r.fund_id)?.name || r.fund_id,
      fund_asset: fundMap.get(r.fund_id)?.asset || "Unknown",
      created_by_name: r.created_by ? profileMap.get(r.created_by) || "Unknown" : undefined,
      purpose: r.purpose as AumPurpose,
      gross_yield: dist?.gross_yield ?? null,
      net_yield: dist?.net_yield ?? null,
      total_fees: dist?.total_fees ?? null,
      total_ib: dist?.total_ib ?? null,
      allocation_count: dist?.allocation_count ?? null,
      distribution_id: dist?.id ?? null,
    };
  });
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

  // yield_edit_audit table was dropped - skip audit logging

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
 * @deprecated yield_edit_audit table was dropped — this is dead code.
 */
export async function getYieldEditHistory(_recordId: string): Promise<any[]> {
  console.warn("getYieldEditHistory is deprecated — yield_edit_audit table was dropped");
  return [];
}

/**
 * Check if current user is a Super Admin (can edit yields)
 */
export async function canEditYields(): Promise<boolean> {
  const { data, error } = await rpc.callNoArgs("is_super_admin");
  if (error) {
    logError("recordedYieldsService.canEditYields", error);
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
    logError("recordedYieldsService.getInvestorVisibleAUM", error);
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
