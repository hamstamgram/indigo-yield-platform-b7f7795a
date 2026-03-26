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
  distribution_type: string | null;
  /** @precision NUMERIC - string preserves DB numeric(38,18) */
  gross_yield: number | string;
  /** @precision NUMERIC */
  total_fees: number | string | null;
  /** @precision NUMERIC */
  total_ib: number | string | null;
  /** @precision NUMERIC */
  total_fee_credit: number | string | null;
  /** @precision NUMERIC */
  net_yield: number | string | null;
  /** @precision NUMERIC */
  recorded_aum: number | string;
  allocation_count: number | null;
  created_at: string;
  is_voided: boolean | null;
  summary_json: unknown | null;
};

export type AllocationRow = {
  id: string;
  distribution_id: string;
  investor_id: string;
  /** @precision NUMERIC */
  gross_amount: number | string;
  /** @precision NUMERIC */
  fee_amount: number | string | null;
  /** @precision NUMERIC */
  ib_amount: number | string | null;
  /** @precision NUMERIC */
  fee_credit: number | string | null;
  /** @precision NUMERIC */
  net_amount: number | string;
  /** @precision NUMERIC */
  adb_share: number | string | null;
  /** @precision NUMERIC */
  ownership_pct: number | string | null;
  /** @precision NUMERIC */
  fee_pct: number | string | null;
  /** @precision NUMERIC */
  ib_pct: number | string | null;
  /** @precision NUMERIC */
  position_value_at_calc: number | string | null;
  ib_investor_name: string | null;
};

export type FeeAllocationRow = {
  id: string;
  distribution_id: string;
  investor_id: string;
  /** @precision NUMERIC */
  base_net_income: number | string;
  /** @precision NUMERIC */
  fee_amount: number | string;
  /** @precision NUMERIC */
  fee_percentage: number | string;
};

export type YieldEventRow = {
  id: string;
  investor_id: string;
  /** @precision NUMERIC */
  gross_yield_amount: number | string;
  /** @precision NUMERIC */
  fee_amount: number | string | null;
  /** @precision NUMERIC */
  fee_pct: number | string | null;
  /** @precision NUMERIC */
  net_yield_amount: number | string;
  /** @precision NUMERIC */
  investor_share_pct: number | string;
  /** @precision NUMERIC */
  investor_balance: number | string;
  trigger_type: string;
  period_start: string | null;
  period_end: string | null;
  /** @precision NUMERIC */
  fund_aum_before: number | string | null;
  /** @precision NUMERIC */
  fund_aum_after: number | string | null;
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
  yieldEventsByDistribution: Record<string, YieldEventRow[]>;
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
        distribution_type,
        gross_yield,
        total_fees,
        total_ib,
        total_fee_credit,
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
      const [year, month] = filters.month.split("-").map(Number);
      const startDate = `${filters.month}-01`;
      const nextMonth = new Date(year, month, 1);
      const endDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
      query = query.gte("effective_date", startDate);
      query = query.lt("effective_date", endDate);
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
        yieldEventsByDistribution: {},
        investorMap: {},
      };
    }

    const allInvestorIds = new Set<string>();

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
        fee_credit,
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

    const rawAllocations = (allocationRows || []) as (Omit<AllocationRow, "ib_investor_name"> & {
      ib_investor_name?: string | null;
    })[];

    // Fetch IB allocations to enrich with IB person names
    const { data: ibAllocRows } = await supabase
      .from("ib_allocations")
      .select("distribution_id, source_investor_id, ib_investor_id")
      .in("distribution_id", distributionIds)
      .eq("is_voided", false);

    // Build map: (distribution_id, source_investor_id) -> ib_investor_id
    const ibMap = new Map<string, string>();
    const ibPersonIds = new Set<string>();
    (ibAllocRows || []).forEach((ib) => {
      const key = `${ib.distribution_id}:${ib.source_investor_id}`;
      ibMap.set(key, ib.ib_investor_id);
      ibPersonIds.add(ib.ib_investor_id);
    });

    // Fetch IB person profiles
    const ibProfileMap = new Map<string, string>();
    if (ibPersonIds.size > 0) {
      const { data: ibProfiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", Array.from(ibPersonIds));
      (ibProfiles || []).forEach((p) => {
        ibProfileMap.set(p.id, `${p.first_name || ""} ${p.last_name || ""}`.trim());
      });
    }

    // Enrich allocations with IB person name
    const allocations: AllocationRow[] = rawAllocations.map((a) => {
      const ibKey = `${a.distribution_id}:${a.investor_id}`;
      const ibInvestorId = ibMap.get(ibKey);
      return {
        ...a,
        ib_investor_name: ibInvestorId ? ibProfileMap.get(ibInvestorId) || null : null,
      };
    });

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

    // Collect investor IDs from yield_allocations and fee_allocations
    allocations.forEach((a) => allInvestorIds.add(a.investor_id));
    Object.values(feeGrouped).forEach((feeRows) =>
      feeRows.forEach((r) => allInvestorIds.add(r.investor_id))
    );

    // NOTE: The third fallback (investor_yield_events) has been removed in V6.
    // yield_allocations is now the sole authoritative per-investor breakdown.
    const yieldEventsGrouped: Record<string, YieldEventRow[]> = {};

    if (allInvestorIds.size === 0) {
      return {
        distributions: rows,
        allocationsByDistribution: grouped,
        feeAllocationsByDistribution: feeGrouped,
        yieldEventsByDistribution: yieldEventsGrouped,
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
      yieldEventsByDistribution: yieldEventsGrouped,
      investorMap: map,
    };
  } catch (error) {
    logError("fetchYieldDistributionsPageData", error);
    throw error;
  }
}
