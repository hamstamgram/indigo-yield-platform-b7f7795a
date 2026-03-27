/**
 * Recorded Yields Service
 * Provides CRUD operations for yield records with audit logging
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";

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
  // In V6, fund_daily_aum is deprecated. We use yield_distributions for historical checkpoints.
  let query = supabase
    .from("yield_distributions")
    .select(
      `
      id,
      fund_id,
      aum_date:effective_date,
      total_aum:recorded_aum,
      is_month_end,
      purpose,
      created_at,
      created_by,
      is_voided,
      voided_at,
      void_reason,
      gross_yield:gross_yield_amount,
      net_yield:total_net_amount,
      total_fees:total_fee_amount,
      total_ib:total_ib_amount,
      allocation_count
    `
    )
    .eq("is_voided", false)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);

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

  return records.map((r) => {
    return {
      ...r,
      fund_name: fundMap.get(r.fund_id)?.name || r.fund_id,
      fund_asset: fundMap.get(r.fund_id)?.asset || "Unknown",
      created_by_name: r.created_by ? profileMap.get(r.created_by) || "Unknown" : undefined,
      purpose: r.purpose as AumPurpose,
      distribution_id: r.id, // In V6, the record ID is the distribution ID
    };
  });
}

// updateYieldRecord: REMOVED (deprecated -- fund_daily_aum was dropped)
// getYieldEditHistory: REMOVED (deprecated -- yield_edit_audit was dropped)

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
  // In V6, AUM history comes from yield_distributions
  let query = supabase
    .from("yield_distributions")
    .select(
      "fund_id, aum_date:effective_date, total_aum:recorded_aum, is_month_end, is_voided, purpose"
    )
    .eq("purpose", "reporting")
    .eq("is_month_end", true)
    .eq("is_voided", false)
    .order("effective_date", { ascending: false })
    .limit(5000);

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
    .from("yield_distributions")
    .select("aum_date:effective_date")
    .eq("fund_id", fundId)
    .eq("purpose", "reporting")
    .eq("is_month_end", true)
    .eq("is_voided", false)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.aum_date;
}
