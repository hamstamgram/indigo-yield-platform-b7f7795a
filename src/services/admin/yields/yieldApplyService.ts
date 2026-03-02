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
import { finalizeMonthYield } from "./yieldCrystallizationService";
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
  const { fundId, targetDate, newTotalAUM, distributionDate } = input;

  const periodEndDate = targetDate;
  const parsedAum = newTotalAUM != null ? parseFinancial(newTotalAUM) : null;
  if (!parsedAum || parsedAum.isNaN() || parsedAum.lte(0)) {
    throw new Error("Recorded AUM must be a positive number.");
  }

  // Call V5 apply RPC (segmented proportional allocation)
  // Use .toString() for financial precision - PostgreSQL NUMERIC handles string input correctly
  // For reporting purpose, always use period end as distribution date (defense-in-depth)
  const effectiveDistDate =
    purpose === "reporting" ? periodEndDate : (distributionDate ?? targetDate);
  const { data, error } = await callRPC("apply_segmented_yield_distribution_v5", {
    p_fund_id: fundId,
    p_period_end: formatDateForDB(periodEndDate),
    p_recorded_aum: parsedAum.toString() as unknown as number,
    p_admin_id: adminId,
    p_purpose: purpose,
    p_distribution_date: formatDateForDB(effectiveDistDate),
  });

  if (error) {
    logError("applyYieldDistribution.v5", error, {
      fundId,
      periodEnd: formatDateForDB(periodEndDate),
      purpose,
    });
    throw new Error(`Failed to apply yield: ${error.message}`);
  }

  // The RPC returns a JSONB object with all distribution details
  const rpcResult = data as unknown as Record<string, unknown>;
  if (!rpcResult || !rpcResult.distribution_id) {
    throw new Error("Apply failed: no distribution data returned");
  }

  const distributionId = rpcResult.distribution_id as string;

  // Map RPC response to a distData-compatible shape used throughout this function
  const distData = {
    opening_aum: String(rpcResult.opening_aum ?? 0),
    recorded_aum: String(rpcResult.recorded_aum ?? 0),
    gross_yield: String(rpcResult.gross_yield ?? 0),
    net_yield: String(rpcResult.net_yield ?? 0),
    total_fees: String(rpcResult.total_fees ?? 0),
    total_ib: String(rpcResult.total_ib ?? 0),
    total_fee_credit: "0",
    total_ib_credit: "0",
    investor_count: Number(rpcResult.allocation_count ?? 0),
    period_start: rpcResult.period_start as string,
    period_end: rpcResult.period_end as string,
    dust_amount: String(rpcResult.dust_amount ?? 0),
  };

  const result: Partial<V5YieldRPCResult> = {
    success: true,
    opening_aum: Number(distData.opening_aum || 0),
    recorded_aum: Number(distData.recorded_aum || 0),
    gross_yield: Number(distData.gross_yield || 0),
    net_yield: Number(distData.net_yield || 0),
    total_fees: Number(distData.total_fees || 0),
    total_ib: Number(distData.total_ib || 0),
    total_fee_credit: 0,
    total_ib_credit: 0,
    investor_count: Number(distData.investor_count || 0),
    period_start: distData.period_start,
    period_end: distData.period_end,
  };

  // Finalize yield visibility
  try {
    await finalizeMonthYield(fundId, targetDate.getFullYear(), targetDate.getMonth() + 1, adminId);
  } catch (finalizationError) {
    logWarn("applyYieldDistribution.finalization", { fundId, error: finalizationError });
  }

  // Send yield notifications to affected investors (non-blocking)
  const { data: fundInfo } = await supabase
    .from("funds")
    .select("name, asset, code")
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
    const openingAumDec = parseFinancial(distData.opening_aum);
    const grossYieldDec = parseFinancial(distData.gross_yield);
    const notificationDistributions = affectedInvestors.map((inv) => ({
      userId: inv.investor_id,
      distributionId: `yield:${fundId}:${formatDateForDB(periodEndDate)}:${inv.investor_id}`,
      fundId,
      fundName: fundInfo.name,
      amount: parseFinancial(inv.amount).toNumber(),
      asset: fundInfo.asset,
      yieldDate: formatDateForDB(periodEndDate),
      yieldPercentage: openingAumDec.gt(0)
        ? grossYieldDec.div(openingAumDec).times(100).toNumber()
        : undefined,
    }));

    yieldNotifications
      .onFundYieldDistributed(notificationDistributions)
      .catch((err) => logError("sendYieldNotifications", err, { fundId }));

    // Fire mobile push notifications (best-effort, non-blocking)
    const investorIds = [...new Set(affectedInvestors.map((i) => i.investor_id))];
    const openingAum = parseFinancial(distData.opening_aum);
    const grossYield = parseFinancial(distData.gross_yield);
    const yieldPct = openingAum.gt(0)
      ? `${grossYield.div(openingAum).times(100).toDecimalPlaces(2)}%`
      : undefined;
    const monthLabel = targetDate.toLocaleString("en-GB", { month: "long", year: "numeric" });

    supabase.functions
      .invoke("notify-yield-applied", {
        body: { investor_ids: investorIds, period_label: monthLabel, yield_pct: yieldPct },
      })
      .catch((err) => logError("notify-yield-applied.invoke", err, { fundId }));
  }

  const yieldDistributions: YieldDistribution[] = [];
  const totals: YieldTotals = {
    gross: String(distData.gross_yield ?? 0),
    fees: String(distData.total_fees ?? 0),
    ibFees: String(distData.total_ib ?? 0),
    net: String(distData.net_yield ?? 0),
    indigoCredit: String(distData.total_fees ?? 0),
  };

  return {
    success: true,
    fundId,
    fundCode: fundInfo?.code || "",
    fundAsset: fundInfo?.asset || "",
    yieldDate: targetDate,
    purpose,
    currentAUM: String(distData.opening_aum || 0),
    newAUM: String(distData.recorded_aum || parsedAum.toString()),
    grossYield: totals.gross,
    netYield: totals.net,
    totalFees: totals.fees,
    totalIbFees: totals.ibFees,
    yieldPercentage: "0",
    investorCount: Number(distData.investor_count ?? 0),
    distributions: yieldDistributions,
    ibCredits: [],
    indigoFeesCredit: totals.indigoCredit,
    existingConflicts: [],
    hasConflicts: false,
    totals,
    status: "applied",
    // V5 segmented fields
    periodStart: distData.period_start,
    periodEnd: distData.period_end,
    daysInPeriod: 0,
    dustAmount: String(distData.dust_amount ?? 0),
    calculationMethod: "segmented_v5",
    features: ["segmented_proportional"],
    conservationCheck: true,
    segmentCount: undefined,
    openingAum: String(distData.opening_aum || 0),
    recordedAum: String(distData.recorded_aum || 0),
    crystalsInPeriod: 0,
  };
}
