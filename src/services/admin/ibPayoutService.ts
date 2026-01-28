/**
 * IB Payout Service
 * Admin operations for managing IB commission payouts
 */

import { supabase } from "@/integrations/supabase/client";
import type { IBAllocationWithJoins, IBProfileRef, IBFundRef } from "@/types/domains/ibAllocation";
import { generateUUID } from "@/lib/utils";

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
      console.error("Error fetching IB allocations:", error);
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
