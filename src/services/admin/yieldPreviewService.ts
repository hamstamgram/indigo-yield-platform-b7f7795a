/**
 * Yield Preview Service
 * Handles yield distribution preview calculations
 * Split from yieldDistributionService for better maintainability
 */

import { supabase } from "@/integrations/supabase/client";
import { getFundPeriodSnapshot } from "@/services/operations/snapshotService";
import { logError } from "@/lib/logger";

import type {
  YieldCalculationInput,
  YieldDistribution,
  IBCredit,
  YieldTotals,
  YieldCalculationResult,
} from "@/types/domains/yield";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

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
 * Preview yield distribution using backend RPC for exact parity with apply.
 * This is a read-only operation that returns computed distributions.
 */
export async function previewYieldDistribution(
  input: YieldCalculationInput
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM, purpose = "reporting" } = input;

  // Validate fundId is a valid UUID
  if (!fundId || !isValidUUID(fundId)) {
    throw new Error(`Invalid fund ID format: "${fundId}". Expected a valid UUID.`);
  }

  // Get snapshot info for display
  const periodId = await getPeriodIdForDate(targetDate);
  let snapshotInfo: YieldCalculationResult["snapshotInfo"];
  
  if (periodId) {
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

  // Get current positions for AUM calculation
  const { data: positions, error: posError } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  if (posError) {
    throw new Error(`Failed to fetch positions: ${posError.message}`);
  }

  const currentAUM = positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;
  const grossYieldAmount = Math.max(newTotalAUM - currentAUM, 0);

  if (grossYieldAmount <= 0) {
    throw new Error(`New AUM (${newTotalAUM}) must be greater than current AUM (${currentAUM}) to distribute yield`);
  }

  // Get user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Authentication required");
  }

  const { data: fund } = await supabase
    .from("funds")
    .select("code, asset")
    .eq("id", fundId)
    .maybeSingle();

  // Call backend preview RPC
  const { data, error } = await (supabase.rpc as any)("preview_daily_yield_to_fund_v3", {
    p_fund_id: fundId,
    p_yield_date: formatDate(targetDate),
    p_new_aum: newTotalAUM,
    p_purpose: purpose,
  });

  if (error) {
    logError("yieldPreview.distribution", error, { fundId, targetDate: formatDate(targetDate) });
    throw new Error(`Failed to preview yield: ${error.message}`);
  }

  const result = data as any;

  if (!result || !result.success) {
    throw new Error(result?.error || "Preview failed: Invalid response from server");
  }

  // Map distributions from backend format
  const distributions: YieldDistribution[] = (result.distributions || []).map((d: any) => ({
    investorId: d.investorId,
    investorName: d.investorName,
    accountType: d.accountType,
    currentBalance: Number(d.currentBalance || 0),
    allocationPercentage: Number(d.allocationPercentage || 0),
    feePercentage: Number(d.feePercentage || 0),
    grossYield: Number(d.grossYield || 0),
    feeAmount: Number(d.feeAmount || 0),
    netYield: Number(d.netYield || 0),
    newBalance: Number(d.newBalance || 0),
    positionDelta: Number(d.positionDelta || 0),
    ibParentId: d.ibParentId,
    ibParentName: d.ibParentName,
    ibPercentage: Number(d.ibPercentage || 0),
    ibAmount: Number(d.ibAmount || 0),
    referenceId: d.referenceId,
    wouldSkip: Boolean(d.wouldSkip),
  }));

  // Map IB credits from backend format
  const ibCredits: IBCredit[] = (result.ibCredits || []).map((ib: any) => ({
    ibInvestorId: ib.ibInvestorId,
    ibInvestorName: ib.ibInvestorName,
    sourceInvestorId: ib.sourceInvestorId,
    sourceInvestorName: ib.sourceInvestorName,
    amount: Number(ib.amount || 0),
    ibPercentage: Number(ib.ibPercentage || 0),
    source: ib.source,
    referenceId: ib.referenceId,
    wouldSkip: Boolean(ib.wouldSkip),
  }));

  // Extract totals from backend response
  const totals: YieldTotals = result.totals ? {
    gross: Number(result.totals.gross || 0),
    fees: Number(result.totals.fees || 0),
    ibFees: Number(result.totals.ibFees || 0),
    net: Number(result.totals.net || 0),
    indigoCredit: Number(result.totals.indigoCredit || 0),
  } : {
    gross: Number(result.grossYield || 0),
    fees: Number(result.totalFees || 0),
    ibFees: Number(result.totalIbFees || 0),
    net: Number(result.netYield || 0),
    indigoCredit: Number(result.indigoFeesCredit || 0),
  };

  return {
    success: true,
    preview: true,
    fundId: result.fundId || fundId,
    fundCode: result.fundCode || fund?.code || "",
    fundAsset: result.fundAsset || fund?.asset || "",
    yieldDate: targetDate,
    effectiveDate: result.effectiveDate || formatDate(targetDate),
    purpose: result.purpose || purpose,
    isMonthEnd: Boolean(result.isMonthEnd),
    currentAUM: Number(result.currentAUM || currentAUM),
    newAUM: Number(result.newAUM || newTotalAUM),
    grossYield: Number(result.grossYield || totals.gross),
    netYield: Number(result.netYield || totals.net),
    totalFees: Number(result.totalFees || totals.fees),
    totalIbFees: Number(result.totalIbFees || totals.ibFees),
    yieldPercentage: Number(result.yieldPercentage || 0),
    investorCount: Number(result.investorCount || distributions.length),
    distributions,
    ibCredits,
    indigoFeesCredit: Number(result.indigoFeesCredit || totals.indigoCredit),
    indigoFeesId: result.indigoFeesId,
    existingConflicts: result.existingConflicts || [],
    hasConflicts: Boolean(result.hasConflicts),
    totals,
    status: "preview",
    snapshotInfo,
  };
}
