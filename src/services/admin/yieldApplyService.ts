/**
 * Yield Apply Service
 * Handles applying yield distributions to investor positions using CFO-grade ADB (time-weighted) allocation.
 *
 * CALCULATION METHOD: ADB (Average Daily Balance) Time-Weighted
 * - Each investor's allocation is based on their time-weighted capital contribution
 * - Mid-period deposits/withdrawals are properly weighted by days held
 * - Loss carryforward: negative months carry forward to offset future gains before fees
 *
 * Note: Period snapshot functionality removed in P1-03 (Unify AUM Snapshot Tables)
 * The fund_period_snapshot table was unused (0 rows) and has been dropped.
 */

import { supabase } from "@/integrations/supabase/client";
import { yieldNotifications } from "@/services/notifications";
import { finalizeMonthYield } from "@/services/admin/yieldCrystallizationService";
import { logWarn, logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { formatDateForDB } from "@/utils/dateUtils";
import { startOfMonth } from "date-fns";

// NOTE: MV refresh removed - platform now uses live views (v_fund_summary_live, v_daily_platform_metrics_live)
// that compute in real-time. No refresh needed.

import type {
  YieldCalculationInput,
  YieldDistribution,
  YieldTotals,
  YieldCalculationResult,
} from "@/types/domains/yield";

/**
 * Apply yield distribution using CFO-grade ADB (time-weighted) allocation.
 * This permanently updates investor positions and creates transactions.
 *
 * The ADB method allocates yield based on each investor's time-weighted capital:
 * - Investor who held $100K for 30 days gets 2x weight vs investor who held $100K for 15 days
 * - Loss carryforward ensures negative months offset future gains before fees
 */
export async function applyYieldDistribution(
  input: YieldCalculationInput,
  adminId: string,
  purpose: "reporting" | "transaction" = "reporting"
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, periodStart, newTotalAUM } = input;

  // Calculate period dates (always full month: 1st to last day)
  const periodEndDate = targetDate;
  const periodStartDate = periodStart || startOfMonth(targetDate);

  // Get current AUM to calculate gross yield amount
  const { data: positions } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fundId)
    .eq("is_active", true);

  const currentAUM = positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;
  const newTotalAUMNum = typeof newTotalAUM === 'string' ? parseFloat(newTotalAUM) : newTotalAUM;
  const grossYieldAmount = newTotalAUMNum - currentAUM;

  // Call ADB apply RPC (time-weighted allocation with loss carryforward)
  const { data, error } = await callRPC("apply_adb_yield_distribution_v3", {
    p_fund_id: fundId,
    p_period_start: formatDateForDB(periodStartDate),
    p_period_end: formatDateForDB(periodEndDate),
    p_gross_yield_amount: grossYieldAmount,
    p_admin_id: adminId,
    p_purpose: purpose,
  });

  if (error) {
    logError("applyYieldDistribution.adb", error, {
      fundId,
      periodStart: formatDateForDB(periodStartDate),
      periodEnd: formatDateForDB(periodEndDate),
      purpose,
    });
    throw new Error(`Failed to apply yield: ${error.message}`);
  }

  const result = data as any;

  if (!result || !result.success) {
    throw new Error(result?.error || "Apply failed: Invalid response from server");
  }

  // NOTE: MV refresh removed - platform now uses live views that compute in real-time

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
    .single();

  const { data: affectedInvestors } = await supabase
    .from("transactions_v2")
    .select("investor_id, amount")
    .eq("fund_id", fundId)
    .eq("tx_date", formatDateForDB(periodEndDate))
    .in("type", ["INTEREST", "YIELD"])
    .eq("is_voided", false);

  if (affectedInvestors?.length && fundInfo) {
    const notificationDistributions = affectedInvestors.map((inv) => ({
      userId: inv.investor_id,
      distributionId: `yield:${fundId}:${formatDateForDB(periodEndDate)}:${inv.investor_id}`,
      fundId,
      fundName: fundInfo.name,
      amount: Number(inv.amount),
      asset: fundInfo.asset,
      yieldDate: formatDateForDB(periodEndDate),
      yieldPercentage: currentAUM > 0 ? (grossYieldAmount / currentAUM) * 100 : undefined,
    }));

    yieldNotifications
      .onFundYieldDistributed(notificationDistributions)
      .catch((err) => logError("sendYieldNotifications", err, { fundId }));
  }

  const yieldDistributions: YieldDistribution[] = [];
  const totals: YieldTotals = {
    gross: String(result?.gross_yield ?? grossYieldAmount),
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
    currentAUM: String(currentAUM),
    newAUM: String(newTotalAUMNum),
    grossYield: totals.gross,
    netYield: totals.net,
    totalFees: totals.fees,
    totalIbFees: totals.ibFees,
    yieldPercentage: String(result?.yield_rate_pct ?? 0),
    investorCount: Number(result?.investor_count ?? 0),
    distributions: yieldDistributions,
    ibCredits: [],
    indigoFeesCredit: totals.indigoCredit,
    existingConflicts: [],
    hasConflicts: false,
    totals,
    status: "applied",
    // ADB-specific fields
    periodStart: formatDateForDB(periodStartDate),
    periodEnd: formatDateForDB(periodEndDate),
    daysInPeriod: Number(result?.days_in_period ?? 0),
    totalAdb: String(result?.total_adb ?? 0),
    yieldRatePct: String(result?.yield_rate_pct ?? 0),
    totalLossOffset: String(result?.total_loss_offset ?? 0),
    dustAmount: String(result?.dust_amount ?? 0),
    calculationMethod: "adb_v3",
    features: result?.features || ["time_weighted", "loss_carryforward"],
    conservationCheck: Boolean(result?.conservation_check),
  };
}
