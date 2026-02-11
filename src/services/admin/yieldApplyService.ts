/**
 * Yield Apply Service
 * Handles applying yield distributions using V5 segmented proportional allocation.
 *
 * CALCULATION METHOD: Segmented Proportional (V5)
 * - Each investor's allocation is proportional to their balance within each segment
 * - Crystallization events define segment boundaries (mid-period flows)
 * - Per-segment fee lookup via get_investor_fee_pct hierarchy
 * - IB commissions tracked in running balances between segments
 * - AUM-only input: gross yield derived from recorded_aum - opening positions
 */

import { supabase } from "@/integrations/supabase/client";
import { yieldNotifications } from "@/services/notifications";
import { finalizeMonthYield } from "@/services/admin/yieldCrystallizationService";
import { logWarn, logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { formatDateForDB } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";

import type {
  YieldCalculationInput,
  YieldDistribution,
  YieldTotals,
  YieldCalculationResult,
  V5YieldRPCResult,
} from "@/types/domains/yield";

/**
 * Apply yield distribution using V5 segmented proportional allocation.
 * This permanently updates investor positions and creates transactions.
 *
 * The V5 method:
 * - Reads crystallization events to split the month into segments
 * - Allocates yield proportionally by balance within each segment
 * - Creates one aggregated YIELD tx per investor covering the full month
 * - Running balances track NET yield, fees, IB between segments
 */
export async function applyYieldDistribution(
  input: YieldCalculationInput,
  adminId: string,
  purpose: "reporting" | "transaction" = "reporting"
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM } = input;

  const periodEndDate = targetDate;
  const parsedAum = newTotalAUM != null ? parseFinancial(newTotalAUM) : null;
  if (!parsedAum || parsedAum.isNaN() || parsedAum.lte(0)) {
    throw new Error("Recorded AUM must be a positive number.");
  }

  // Call V5 apply RPC (segmented proportional allocation)
  // Use .toString() for financial precision - PostgreSQL NUMERIC handles string input correctly
  const { data, error } = await callRPC("apply_segmented_yield_distribution_v5", {
    p_fund_id: fundId,
    p_period_end: formatDateForDB(periodEndDate),
    p_recorded_aum: parsedAum.toString() as unknown as number,
    p_admin_id: adminId,
    p_purpose: purpose,
  });

  if (error) {
    logError("applyYieldDistribution.v5", error, {
      fundId,
      periodEnd: formatDateForDB(periodEndDate),
      purpose,
    });
    throw new Error(`Failed to apply yield: ${error.message}`);
  }

  const result = data as unknown as V5YieldRPCResult;

  if (!result || !result.success) {
    throw new Error(result?.error || "Apply failed: Invalid response from server");
  }

  // Finalize yield visibility
  try {
    await finalizeMonthYield(fundId, targetDate.getFullYear(), targetDate.getMonth() + 1, adminId);
  } catch (finalizationError) {
    logWarn("applyYieldDistribution.finalization", { fundId, error: finalizationError });
  }

  // Send yield notifications to affected investors (non-blocking)
  const { data: fundInfo } = await supabase
    .from("funds")
    .select("name, asset")
    .eq("id", fundId)
    .maybeSingle();

  const { data: affectedInvestors } = await supabase
    .from("transactions_v2")
    .select("investor_id, amount")
    .eq("fund_id", fundId)
    .eq("tx_date", formatDateForDB(periodEndDate))
    .in("type", ["YIELD", "FEE_CREDIT", "IB_CREDIT"])
    .eq("is_voided", false);

  if (affectedInvestors?.length && fundInfo) {
    const openingAumDec = parseFinancial(result.opening_aum);
    const grossYieldDec = parseFinancial(result.gross_yield);
    const notificationDistributions = affectedInvestors.map((inv) => ({
      userId: inv.investor_id,
      distributionId: `yield:${fundId}:${formatDateForDB(periodEndDate)}:${inv.investor_id}`,
      fundId,
      fundName: fundInfo.name,
      amount: parseFinancial(inv.amount).toNumber(), // Safe for notification display
      asset: fundInfo.asset,
      yieldDate: formatDateForDB(periodEndDate),
      yieldPercentage: openingAumDec.gt(0)
        ? grossYieldDec.div(openingAumDec).times(100).toNumber()
        : undefined,
    }));

    yieldNotifications
      .onFundYieldDistributed(notificationDistributions)
      .catch((err) => logError("sendYieldNotifications", err, { fundId }));
  }

  const yieldDistributions: YieldDistribution[] = [];
  const totals: YieldTotals = {
    gross: String(result?.gross_yield ?? 0),
    fees: String(result?.total_fees ?? 0),
    ibFees: String(result?.total_ib ?? 0),
    net: String(result?.net_yield ?? 0),
    indigoCredit: String(result?.total_fees ?? 0),
  };

  return {
    success: true,
    fundId,
    fundCode: result?.fund_code || "",
    fundAsset: result?.fund_asset || fundInfo?.asset || "",
    yieldDate: targetDate,
    purpose,
    currentAUM: String(result?.opening_aum || 0),
    newAUM: String(result?.recorded_aum || parsedAum.toString()),
    grossYield: totals.gross,
    netYield: totals.net,
    totalFees: totals.fees,
    totalIbFees: totals.ibFees,
    yieldPercentage: "0",
    investorCount: Number(result?.investor_count ?? 0),
    distributions: yieldDistributions,
    ibCredits: [],
    indigoFeesCredit: totals.indigoCredit,
    existingConflicts: [],
    hasConflicts: false,
    totals,
    status: "applied",
    // V5 segmented fields
    periodStart: result?.period_start,
    periodEnd: result?.period_end,
    daysInPeriod: Number(result?.days_in_period ?? 0),
    dustAmount: String(result?.dust_amount ?? 0),
    calculationMethod: "segmented_v5",
    features: result?.features || ["segmented_proportional"],
    conservationCheck: Boolean(result?.conservation_check),
    segmentCount: result?.segment_count,
    segments: result?.segments,
    openingAum: String(result?.opening_aum || 0),
    recordedAum: String(result?.recorded_aum || 0),
    crystalsInPeriod: result?.crystals_consolidated ?? 0,
  };
}
