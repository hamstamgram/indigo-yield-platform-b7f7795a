/**
 * Yield Apply Service
 * Handles applying yield distributions to investor positions
 * Split from yieldDistributionService for better maintainability
 */

import { supabase } from "@/integrations/supabase/client";
import {
  ensureSnapshotExists,
  lockPeriodSnapshot,
  isPeriodLocked,
  getFundPeriodSnapshot,
} from "@/services/operations/snapshotService";
import { yieldNotifications } from "@/services/notifications";
import { finalizeMonthYield } from "@/services/admin/yieldCrystallizationService";
import { logWarn, logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { formatDateForDB } from "@/utils/dateUtils";

/**
 * Refresh a materialized view with retry logic for transient failures
 */
async function refreshWithRetry(viewName: string, maxRetries = 2): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await callRPC("refresh_materialized_view_concurrently", { view_name: viewName });
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait 500ms before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

import type {
  YieldCalculationInput,
  YieldDistribution,
  YieldTotals,
  YieldCalculationResult,
} from "@/types/domains/yield";

/**
 * Get period ID for a given date
 */
async function getPeriodIdForDate(targetDate: Date): Promise<string | null> {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  const { data, error } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (error || !data) {
    const { data: nextPeriod } = await supabase
      .from("statement_periods")
      .select("id")
      .or(`year.gt.${year},and(year.eq.${year},month.gte.${month})`)
      .order("year", { ascending: true })
      .order("month", { ascending: true })
      .limit(1)
      .maybeSingle();
    return nextPeriod?.id || null;
  }
  return data.id;
}

/**
 * Apply yield distribution (calls RPC function)
 * This permanently updates investor positions and creates transactions.
 * Also generates and locks a snapshot for the period to preserve ownership percentages.
 */
export async function applyYieldDistribution(
  input: YieldCalculationInput,
  adminId: string,
  purpose: "reporting" | "transaction" = "reporting"
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM } = input;

  // Get or create period snapshot before applying yield
  const periodId = await getPeriodIdForDate(targetDate);
  let snapshotInfo: YieldCalculationResult["snapshotInfo"];

  if (periodId) {
    // Check if period is already locked
    const isLocked = await isPeriodLocked(fundId, periodId);
    if (isLocked) {
      throw new Error("This period is locked. Yield has already been applied for this period.");
    }

    // Ensure snapshot exists (creates one if not)
    const snapshotResult = await ensureSnapshotExists(fundId, periodId, adminId);
    if (!snapshotResult.exists) {
      logWarn("applyYieldDistribution.snapshotCreate", {
        fundId,
        periodId,
        error: snapshotResult.error,
      });
    } else if (snapshotResult.snapshotId) {
      const snapshot = await getFundPeriodSnapshot(fundId, periodId);
      if (snapshot) {
        snapshotInfo = {
          snapshotId: snapshot.id,
          snapshotDate: snapshot.snapshot_date,
          isLocked: snapshot.is_locked,
          periodId,
        };
      }
    }
  }

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

  // Refresh materialized views to ensure dashboard data consistency
  // Uses retry logic for transient failures
  try {
    await Promise.all([
      refreshWithRetry("mv_fund_summary"),
      refreshWithRetry("mv_daily_platform_metrics"),
    ]);
  } catch (mvError) {
    // Log but don't fail the operation
    logWarn("applyYieldDistribution.mvRefresh", { fundId, error: mvError });
  }

  // Lock the snapshot after successful yield application
  if (periodId && snapshotInfo) {
    const lockResult = await lockPeriodSnapshot(fundId, periodId, adminId);
    if (lockResult.success) {
      snapshotInfo.isLocked = true;
    }
  }

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
    snapshotInfo,
  };
}
