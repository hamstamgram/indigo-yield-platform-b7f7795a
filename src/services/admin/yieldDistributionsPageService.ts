/**
 * Yield Distributions Page Service
 * Encapsulates data fetching for the Yield Distributions admin page
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

export interface YieldDistributionsFilters {
  fundId: string; // "all" or a uuid
  month: string; // "YYYY-MM" or ""
  purpose: string; // "all" | "transaction" | "reporting"
  includeVoided?: boolean;
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

export type FeeAllocationRow = {
  id: string;
  distribution_id: string;
  investor_id: string;
  base_net_income: number;
  fee_amount: number;
  fee_percentage: number;
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
  feeAllocationsByDistribution: Record<string, FeeAllocationRow[]>;
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
      .order("effective_date", { ascending: false })
      .limit(120);

    if (!filters.includeVoided) {
      query = query.eq("is_voided", false);
    }

    if (filters.fundId !== "all") {
      query = query.eq("fund_id", filters.fundId);
    }

    if (filters.month) {
      query = query.gte("effective_date", `${filters.month}-01`);
      query = query.lt("effective_date", `${filters.month}-32`);
    }

    if (filters.purpose && filters.purpose !== "all") {
      query = query.eq("purpose", filters.purpose as "transaction" | "reporting");
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as DistributionRow[];

    const distributionIds = rows.map((row) => row.id);
    if (distributionIds.length === 0) {
      return {
        distributions: rows,
        allocationsByDistribution: {},
        feeAllocationsByDistribution: {},
        investorMap: {},
      };
    }

    // Fetch yield_allocations (primary breakdown)
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

    // Fetch fee_allocations (fallback for distributions without yield_allocations)
    const distIdsWithoutAllocations = distributionIds.filter((id) => !grouped[id]?.length);
    const feeGrouped: Record<string, FeeAllocationRow[]> = {};

    if (distIdsWithoutAllocations.length > 0) {
      const { data: feeRows, error: feeError } = await supabase
        .from("fee_allocations")
        .select(`id, distribution_id, investor_id, base_net_income, fee_amount, fee_percentage`)
        .in("distribution_id", distIdsWithoutAllocations)
        .eq("is_voided", false);

      if (!feeError && feeRows) {
        (feeRows as FeeAllocationRow[]).forEach((row) => {
          if (!feeGrouped[row.distribution_id]) {
            feeGrouped[row.distribution_id] = [];
          }
          feeGrouped[row.distribution_id].push(row);
        });
      }
    }

    // Collect all investor IDs from both allocation sources
    const allInvestorIds = new Set<string>();
    allocations.forEach((a) => allInvestorIds.add(a.investor_id));
    Object.values(feeGrouped).forEach((rows) =>
      rows.forEach((r) => allInvestorIds.add(r.investor_id))
    );

    if (allInvestorIds.size === 0) {
      return {
        distributions: rows,
        allocationsByDistribution: grouped,
        feeAllocationsByDistribution: feeGrouped,
        investorMap: {},
      };
    }

    const { data: investors, error: investorError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", Array.from(allInvestorIds));

    if (investorError) throw investorError;

    const map: Record<string, InvestorProfile> = {};
    (investors || []).forEach((profile) => {
      map[profile.id] = profile as InvestorProfile;
    });

    return {
      distributions: rows,
      allocationsByDistribution: grouped,
      feeAllocationsByDistribution: feeGrouped,
      investorMap: map,
    };
  } catch (error) {
    logError("fetchYieldDistributionsPageData", error);
    throw error;
  }
}
