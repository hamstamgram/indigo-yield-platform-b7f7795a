/**
 * Yield Preview Service
 * Handles yield distribution preview using V5 segmented proportional allocation.
 *
 * CALCULATION METHOD: Segmented Proportional (V5)
 * - Each investor's allocation is proportional to their balance within each segment
 * - Crystallization events define segment boundaries (mid-period flows)
 * - Per-segment fee lookup via get_investor_fee_pct hierarchy
 * - IB commissions tracked in running balances between segments
 * - AUM-only input: gross yield derived from recorded_aum - opening positions
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { formatDateForDB } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";

import type {
  YieldCalculationInput,
  YieldDistribution,
  IBCredit,
  YieldTotals,
  YieldCalculationResult,
  V5YieldRPCResult,
  V5AllocationItem,
} from "@/types/domains/yield";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Preview yield distribution using V5 segmented proportional allocation.
 * This is a read-only operation that returns computed distributions with segment breakdown.
 *
 * The V5 method:
 * - Reads crystallization events to split the month into segments
 * - Allocates yield proportionally by balance within each segment
 * - Running balances track NET yield, fees, IB between segments
 * - Per-segment fee lookup via get_investor_fee_pct hierarchy
 */
export async function previewYieldDistribution(
  input: YieldCalculationInput
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM, purpose = "reporting" } = input;

  // Validate fundId is a valid UUID
  if (!fundId || !isValidUUID(fundId)) {
    throw new Error(`Invalid fund ID format: "${fundId}". Expected a valid UUID.`);
  }

  const periodEndDate = targetDate;
  const parsedAum = newTotalAUM != null ? parseFinancial(newTotalAUM) : null;
  if (!parsedAum || parsedAum.isNaN() || parsedAum.lte(0)) {
    throw new Error("Recorded AUM must be a positive number.");
  }

  // Get fund info
  const fundResult = await supabase
    .from("funds")
    .select("code, asset, name")
    .eq("id", fundId)
    .maybeSingle();
  const fund = fundResult.data;

  // Call V5 preview RPC (segmented proportional allocation)
  // Use .toString() for financial precision - PostgreSQL NUMERIC handles string input correctly
  const { data, error } = await callRPC("preview_segmented_yield_distribution_v5", {
    p_fund_id: fundId,
    p_period_end: formatDateForDB(periodEndDate),
    p_recorded_aum: parsedAum.toString() as unknown as number,
    p_purpose: purpose,
  });

  if (error) {
    logError("yieldPreview.v5", error, {
      fundId,
      periodEnd: formatDateForDB(periodEndDate),
    });
    throw new Error(`Failed to preview yield: ${error.message}`);
  }

  const result = data as unknown as V5YieldRPCResult;

  if (!result || !result.success) {
    throw new Error(result?.error || "Preview failed: Invalid response from server");
  }

  // Map distributions from V5 backend format
  const distributions: YieldDistribution[] = (result.allocations || []).map(
    (d: V5AllocationItem) => ({
      investorId: d.investor_id,
      investorName: d.investor_name,
      accountType: d.account_type,
      currentBalance: String(d.gross || 0), // Use gross as "current" context for display
      allocationPercentage: "0",
      feePercentage: String(d.fee_pct || 0),
      grossYield: String(d.gross || 0),
      feeAmount: String(d.fee || 0),
      netYield: String(d.net || 0),
      newBalance: "0",
      positionDelta: String(d.net || 0),
      ibParentId: d.ib_parent_id,
      ibPercentage: String(d.ib_rate || 0),
      ibAmount: String(d.ib || 0),
      referenceId: "",
      wouldSkip: false,
      hasIb: Boolean(d.ib_parent_id && Number(d.ib_rate || 0) > 0),
      // V5-specific: per-investor segment breakdown
      segmentDetails: d.segments || [],
    })
  );

  const ibCredits: IBCredit[] = [];

  const totals: YieldTotals = {
    gross: String(result.gross_yield || 0),
    fees: String(result.total_fees || 0),
    ibFees: String(result.total_ib || 0),
    net: String(result.net_yield || 0),
    indigoCredit: String(result.total_fees || 0),
  };

  return {
    success: true,
    preview: true,
    fundId: result.fund_id || fundId,
    fundCode: result.fund_code || fund?.code || "",
    fundAsset: result.fund_asset || fund?.asset || "",
    yieldDate: targetDate,
    effectiveDate: formatDateForDB(periodEndDate),
    purpose,
    isMonthEnd: false,
    currentAUM: String(result.opening_aum || 0),
    newAUM: String(result.recorded_aum || parsedAum.toString()),
    grossYield: totals.gross,
    netYield: totals.net,
    totalFees: totals.fees,
    totalIbFees: totals.ibFees,
    yieldPercentage:
      result.opening_aum && parseFinancial(result.opening_aum).gt(0)
        ? parseFinancial(result.gross_yield || 0)
            .div(parseFinancial(result.opening_aum))
            .times(100)
            .toString()
        : "0",
    investorCount: Number(result.investor_count || distributions.length),
    distributions,
    ibCredits,
    indigoFeesCredit: totals.indigoCredit,
    indigoFeesId: undefined,
    existingConflicts: [],
    hasConflicts: false,
    totals,
    status: "preview",
    // V5 segmented fields
    periodStart: result.period_start,
    periodEnd: result.period_end,
    daysInPeriod: Number(result.days_in_period || 0),
    dustAmount: String(result.dust_amount || 0),
    calculationMethod: "segmented_v5",
    features: result.features || ["segmented_proportional"],
    conservationCheck: Boolean(result.conservation_check),
    segmentCount: result.segment_count,
    segments: result.segments,
    openingAum: String(result.opening_aum || 0),
    recordedAum: String(result.recorded_aum || 0),
    crystalsInPeriod: result.crystal_count ?? 0,
  };
}
