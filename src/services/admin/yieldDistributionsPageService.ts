/**
 * Yield Distributions Page Service
 * Encapsulates data fetching for the Yield Distributions admin page
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

export interface YieldDistributionsFilters {
  fundId: string; // "all" or a uuid
  month: string; // "YYYY-MM" or ""
}

export type DistributionRow = {
  id: string;
  fund_id: string;
  yield_date: string | null;
  period_start: string | null;
  period_end: string | null;
  effective_date: string;
  purpose: "reporting" | "transaction";
  gross_yield: number;
  total_fees: number | null;
  total_ib: number | null;
  net_yield: number | null;
  recorded_aum: number;
  allocation_count: number | null;
  created_at: string;
  is_voided: boolean | null;
  summary_json: unknown | null;
};

export type AllocationRow = {
  id: string;
  distribution_id: string;
  investor_id: string;
  gross_amount: number;
  fee_amount: number | null;
  ib_amount: number | null;
  net_amount: number;
  adb_share: number | null;
  ownership_pct: number | null;
  fee_pct: number | null;
  ib_pct: number | null;
  position_value_at_calc: number | null;
};

export type InvestorProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export interface YieldDistributionsPageData {
  distributions: DistributionRow[];
  allocationsByDistribution: Record<string, AllocationRow[]>;
  investorMap: Record<string, InvestorProfile>;
}

export async function fetchYieldDistributionsPageData(
  filters: YieldDistributionsFilters
): Promise<YieldDistributionsPageData> {
  try {
    let query = supabase
      .from("yield_distributions")
      .select(
        `
        id,
        fund_id,
        yield_date,
        period_start,
        period_end,
        effective_date,
        purpose,
        gross_yield,
        total_fees,
        total_ib,
        net_yield,
        recorded_aum,
        allocation_count,
        created_at,
        is_voided,
        summary_json
      `
      )
      .eq("is_voided", false)
      .order("effective_date", { ascending: false })
      .limit(120);

    if (filters.fundId !== "all") {
      query = query.eq("fund_id", filters.fundId);
    }

    if (filters.month) {
      query = query.gte("effective_date", `${filters.month}-01`);
      query = query.lt("effective_date", `${filters.month}-32`);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as DistributionRow[];

    const distributionIds = rows.map((row) => row.id);
    if (distributionIds.length === 0) {
      return {
        distributions: rows,
        allocationsByDistribution: {},
        investorMap: {},
      };
    }

    const { data: allocationRows, error: allocationError } = await supabase
      .from("yield_allocations")
      .select(
        `
        id,
        distribution_id,
        investor_id,
        gross_amount,
        fee_amount,
        ib_amount,
        net_amount,
        adb_share,
        ownership_pct,
        fee_pct,
        ib_pct,
        position_value_at_calc
      `
      )
      .in("distribution_id", distributionIds)
      .eq("is_voided", false);

    if (allocationError) throw allocationError;

    const allocations = (allocationRows || []) as AllocationRow[];
    const grouped: Record<string, AllocationRow[]> = {};
    allocations.forEach((allocation) => {
      if (!grouped[allocation.distribution_id]) {
        grouped[allocation.distribution_id] = [];
      }
      grouped[allocation.distribution_id].push(allocation);
    });

    const investorIds = Array.from(new Set(allocations.map((a) => a.investor_id)));
    if (investorIds.length === 0) {
      return {
        distributions: rows,
        allocationsByDistribution: grouped,
        investorMap: {},
      };
    }

    const { data: investors, error: investorError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", investorIds);

    if (investorError) throw investorError;

    const map: Record<string, InvestorProfile> = {};
    (investors || []).forEach((profile) => {
      map[profile.id] = profile as InvestorProfile;
    });

    return {
      distributions: rows,
      allocationsByDistribution: grouped,
      investorMap: map,
    };
  } catch (error) {
    logError("fetchYieldDistributionsPageData", error);
    throw error;
  }
}
