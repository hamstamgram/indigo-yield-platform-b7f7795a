/**
 * IB Payout Service
 * Admin operations for managing IB commission payouts
 */

import { supabase } from "@/integrations/supabase/client";
import type { IBAllocationWithJoins, IBProfileRef, IBFundRef } from "@/types/domains/ibAllocation";
import { generateUUID } from "@/lib/utils";
import { logError } from "@/lib/logger";

export interface IBPayoutDashboard {
  totalCommissionByAsset: Record<string, number>;
  activeIBCount: number;
  mtdCommissionByAsset: Record<string, number>;
  pendingCount: number;
  paidCount: number;
  ibSummaries: IBSummaryRow[];
}

export interface IBSummaryRow {
  ibId: string;
  ibName: string;
  ibEmail: string;
  referredInvestorCount: number;
  totalCommissionByAsset: Record<string, number>;
  latestPayoutDate: string | null;
}

export interface PendingCommission {
  id: string;
  ibInvestorId: string;
  ibName: string;
  ibEmail: string;
  sourceInvestorName: string;
  fundName: string;
  asset: string;
  ibFeeAmount: number;
  effectiveDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  payoutStatus: "pending" | "paid";
}

class IBPayoutService {
  /**
   * Get dashboard summary data for IB payouts
   */
  async getDashboard(): Promise<IBPayoutDashboard> {
    // Fetch all non-voided allocations with IB profiles
    const { data: allocations, error } = await supabase
      .from("ib_allocations")
      .select(
        `
        id,
        ib_investor_id,
        source_investor_id,
        ib_fee_amount,
        effective_date,
        payout_status,
        paid_at,
        fund_id,
        funds!inner(name, asset),
        ib_profile:profiles!ib_allocations_ib_investor_id_fkey(
          first_name, last_name, email
        )
      `
      )
      .eq("is_voided", false)
      .order("effective_date", { ascending: false });

    if (error) {
      logError("ibPayoutService.getDashboard", error);
      return {
        totalCommissionByAsset: {},
        activeIBCount: 0,
        mtdCommissionByAsset: {},
        pendingCount: 0,
        paidCount: 0,
        ibSummaries: [],
      };
    }

    const typed = (allocations || []) as unknown as (IBAllocationWithJoins & {
      fund_id: string;
      paid_at: string | null;
    })[];
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalByAsset: Record<string, number> = {};
    const mtdByAsset: Record<string, number> = {};
    let pendingCount = 0;
    let paidCount = 0;

    // Per-IB aggregation
    const ibMap = new Map<
      string,
      {
        ibName: string;
        ibEmail: string;
        sourceInvestors: Set<string>;
        commissionByAsset: Record<string, number>;
        latestPayoutDate: string | null;
      }
    >();

    for (const alloc of typed) {
      const fund = alloc.funds as IBFundRef | null;
      const asset = fund?.asset || "UNKNOWN";
      const amount = Number(alloc.ib_fee_amount);
      const ibProfile = alloc.ib_profile as IBProfileRef | null;

      // Totals by asset
      totalByAsset[asset] = (totalByAsset[asset] || 0) + amount;

      // MTD by asset
      if (new Date(alloc.effective_date) >= mtdStart) {
        mtdByAsset[asset] = (mtdByAsset[asset] || 0) + amount;
      }

      // Status counts
      if (alloc.payout_status === "paid") paidCount++;
      else pendingCount++;

      // Per-IB summary
      const ibId = alloc.ib_investor_id;
      if (!ibMap.has(ibId)) {
        const ibName = ibProfile
          ? `${ibProfile.first_name || ""} ${ibProfile.last_name || ""}`.trim() || ibProfile.email
          : "Unknown IB";
        ibMap.set(ibId, {
          ibName,
          ibEmail: ibProfile?.email || "",
          sourceInvestors: new Set(),
          commissionByAsset: {},
          latestPayoutDate: null,
        });
      }
      const ib = ibMap.get(ibId)!;
      ib.sourceInvestors.add(alloc.source_investor_id);
      ib.commissionByAsset[asset] = (ib.commissionByAsset[asset] || 0) + amount;
      if (alloc.paid_at && (!ib.latestPayoutDate || alloc.paid_at > ib.latestPayoutDate)) {
        ib.latestPayoutDate = alloc.paid_at;
      }
    }

    const ibSummaries: IBSummaryRow[] = Array.from(ibMap.entries()).map(([ibId, data]) => ({
      ibId,
      ibName: data.ibName,
      ibEmail: data.ibEmail,
      referredInvestorCount: data.sourceInvestors.size,
      totalCommissionByAsset: data.commissionByAsset,
      latestPayoutDate: data.latestPayoutDate,
    }));

    // Sort by total commission descending
    ibSummaries.sort((a, b) => {
      const totalA = Object.values(a.totalCommissionByAsset).reduce((s, v) => s + v, 0);
      const totalB = Object.values(b.totalCommissionByAsset).reduce((s, v) => s + v, 0);
      return totalB - totalA;
    });

    return {
      totalCommissionByAsset: totalByAsset,
      activeIBCount: ibMap.size,
      mtdCommissionByAsset: mtdByAsset,
      pendingCount,
      paidCount,
      ibSummaries,
    };
  }

  /**
   * Get allocations for payout management
   */
  async getAllocationsForPayout(statusFilter: string): Promise<PendingCommission[]> {
    let query = supabase
      .from("ib_allocations")
      .select(
        `
        id,
        ib_investor_id,
        source_investor_id,
        ib_fee_amount,
        effective_date,
        period_start,
        period_end,
        payout_status,
        funds!inner(name, asset),
        ib_profile:profiles!ib_allocations_ib_investor_id_fkey(
          first_name,
          last_name,
          email
        ),
        source_profile:profiles!ib_allocations_source_investor_id_fkey(
          first_name,
          last_name,
          email
        )
      `
      )
      .eq("is_voided", false)
      .order("effective_date", { ascending: false })
      .limit(1000);

    if (statusFilter !== "all") {
      query = query.eq("payout_status", statusFilter);
    }

    const { data: allocations, error } = await query;

    if (error) {
      logError("ibPayoutService.getAllocationsForPayout", error);
      return [];
    }

    // Type the allocations properly
    const typedAllocations = allocations as unknown as IBAllocationWithJoins[];

    return (typedAllocations || []).map((alloc): PendingCommission => {
      const fund: IBFundRef | null = alloc.funds;
      const ibProfile: IBProfileRef | null = alloc.ib_profile;
      const sourceProfile: IBProfileRef | null = alloc.source_profile;

      const ibName = ibProfile
        ? `${ibProfile.first_name || ""} ${ibProfile.last_name || ""}`.trim() || ibProfile.email
        : "Unknown IB";
      const sourceName = sourceProfile
        ? `${sourceProfile.first_name || ""} ${sourceProfile.last_name || ""}`.trim() ||
          sourceProfile.email
        : "Unknown";

      return {
        id: alloc.id,
        ibInvestorId: alloc.ib_investor_id,
        ibName,
        ibEmail: ibProfile?.email || "",
        sourceInvestorName: sourceName,
        fundName: fund?.name || "Unknown",
        asset: fund?.asset || "UNKNOWN",
        ibFeeAmount: Number(alloc.ib_fee_amount),
        effectiveDate: alloc.effective_date,
        periodStart: alloc.period_start,
        periodEnd: alloc.period_end,
        payoutStatus: (alloc.payout_status || "pending") as "pending" | "paid",
      };
    });
  }

  /**
   * Mark allocations as paid
   */
  async markAllocationsAsPaid(
    ids: string[],
    paidBy: string
  ): Promise<{ count: number; batchId: string }> {
    const batchId = generateUUID();

    const { error } = await supabase
      .from("ib_allocations")
      .update({
        payout_status: "paid",
        paid_at: new Date().toISOString(),
        paid_by: paidBy,
        payout_batch_id: batchId,
      })
      .in("id", ids);

    if (error) throw error;

    return { count: ids.length, batchId };
  }
}

export const ibPayoutService = new IBPayoutService();
