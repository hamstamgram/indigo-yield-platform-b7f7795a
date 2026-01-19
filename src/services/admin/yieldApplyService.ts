/**
 * Yield Apply Service
 * Handles applying yield distributions to investor positions
 * Split from yieldDistributionService for better maintainability
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

// NOTE: MV refresh removed - platform now uses live views (v_fund_summary_live, v_daily_platform_metrics_live)
// that compute in real-time. No refresh needed.

import type {
  YieldCalculationInput,
  YieldDistribution,
  YieldTotals,
  YieldCalculationResult,
} from "@/types/domains/yield";

/**
 * Apply yield distribution (calls RPC function)
 * This permanently updates investor positions and creates transactions.
 */
export async function applyYieldDistribution(
  input: YieldCalculationInput,
  adminId: string,
  purpose: "reporting" | "transaction" = "reporting"
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM } = input;

  // IMPORTANT: Derive yield% using the backend preview RPC (AS-OF safe).
  // This prevents "future deposits" from influencing past yield calculations.
  const { data: preview, error: previewError } = await callRPC("preview_daily_yield_to_fund_v3", {
    p_fund_id: fundId,
    p_yield_date: formatDateForDB(targetDate),
    p_new_aum: newTotalAUM,
    p_purpose: purpose,
  });

  if (previewError) {
    logError("applyYieldDistribution.preview", previewError, { fundId, purpose });
    throw new Error(`Failed to preview yield: ${previewError.message}`);
  }

  const previewResult = preview as any;
  if (!previewResult?.success) {
    throw new Error(previewResult?.error || "Preview failed: Invalid response from server");
  }

  const currentAUM = Number(previewResult.currentAUM ?? 0);
  const grossYieldPct = Number(previewResult.yieldPercentage ?? 0);
  const grossYieldAmount = Number(previewResult.grossYield ?? newTotalAUM - currentAUM);

  // Use v3 apply function
  const { data, error } = await callRPC("apply_daily_yield_to_fund_v3", {
    p_fund_id: fundId,
    p_yield_date: formatDateForDB(targetDate),
    p_gross_yield_pct: grossYieldPct,
    p_created_by: adminId,
    p_purpose: purpose,
  });

  if (error) {
    logError("applyYieldDistribution", error, { fundId, purpose });
    throw new Error(`Failed to apply yield: ${error.message}`);
  }

  // NOTE: MV refresh removed - platform now uses live views that compute in real-time

  // Finalize yield visibility
  try {
    await finalizeMonthYield(fundId, targetDate.getFullYear(), targetDate.getMonth() + 1, adminId);
  } catch (finalizationError) {
    logWarn("applyYieldDistribution.finalization", { fundId, error: finalizationError });
  }

  const result = data as any;

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
    .eq("tx_date", formatDateForDB(targetDate))
    .in("type", ["INTEREST", "YIELD"])
    .eq("is_voided", false);

  if (affectedInvestors?.length && fundInfo) {
    const distributions = affectedInvestors.map((inv) => ({
      userId: inv.investor_id,
      distributionId: `yield:${fundId}:${formatDateForDB(targetDate)}:${inv.investor_id}`,
      fundId,
      fundName: fundInfo.name,
      amount: Number(inv.amount),
      asset: fundInfo.asset,
      yieldDate: formatDateForDB(targetDate),
      yieldPercentage: currentAUM > 0 ? (grossYieldAmount / currentAUM) * 100 : undefined,
    }));

    yieldNotifications
      .onFundYieldDistributed(distributions)
      .catch((err) => logError("sendYieldNotifications", err, { fundId }));
  }

  const yieldDistributions: YieldDistribution[] = [];
  const totals: YieldTotals = {
    gross: Number(result?.gross_yield ?? result?.grossYield ?? grossYieldAmount),
    fees: Number(result?.total_fees ?? result?.totalFees ?? 0),
    ibFees: Number(result?.total_ib ?? result?.totalIbFees ?? 0),
    net: Number(result?.net_yield ?? result?.netYield ?? 0),
    indigoCredit: Number(result?.total_fees ?? result?.totalFees ?? 0),
  };

  return {
    success: true,
    fundId,
    fundCode: "",
    fundAsset: "",
    yieldDate: targetDate,
    purpose,
    currentAUM,
    newAUM: newTotalAUM,
    grossYield: totals.gross,
    netYield: totals.net,
    totalFees: totals.fees,
    totalIbFees: totals.ibFees,
    yieldPercentage: grossYieldPct,
    investorCount: Number(
      result?.investor_count ?? result?.investorCount ?? result?.investors_updated ?? 0
    ),
    distributions: yieldDistributions,
    ibCredits: [],
    indigoFeesCredit: totals.indigoCredit,
    existingConflicts: [],
    hasConflicts: false,
    totals,
    status: "applied",
  };
}
