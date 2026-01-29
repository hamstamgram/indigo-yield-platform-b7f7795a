/**
 * Yield Preview Service
 * Handles yield distribution preview calculations using CFO-grade ADB (time-weighted) allocation.
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
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { formatDateForDB } from "@/utils/dateUtils";
import { startOfMonth } from "date-fns";

import type {
  YieldCalculationInput,
  YieldDistribution,
  IBCredit,
  YieldTotals,
  YieldCalculationResult,
  ADBYieldRPCResult,
  ADBAllocationItem,
} from "@/types/domains/yield";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

// Use canonical formatDateForDB from dateUtils - see src/utils/dateUtils.ts for why
// toISOString().split("T")[0] is NOT timezone-safe

/**
 * Preview yield distribution using CFO-grade ADB (time-weighted) allocation.
 * This is a read-only operation that returns computed distributions.
 *
 * The ADB method allocates yield based on each investor's time-weighted capital:
 * - Investor who held $100K for 30 days gets 2x weight vs investor who held $100K for 15 days
 * - Loss carryforward ensures negative months offset future gains before fees
 */
export async function previewYieldDistribution(
  input: YieldCalculationInput
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, periodStart, newTotalAUM, purpose = "reporting" } = input;

  // Validate fundId is a valid UUID
  if (!fundId || !isValidUUID(fundId)) {
    throw new Error(`Invalid fund ID format: "${fundId}". Expected a valid UUID.`);
  }

  // Calculate period dates
  const periodEndDate = targetDate;
  const periodStartDate = periodStart || startOfMonth(targetDate);

  // Get user ID
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Authentication required");
  }

  // Get fund info and current AUM
  // FIX: Match UI filter - only account_type='investor' with current_value > 0
  // This ensures grossYield calculation matches what user sees on screen
  const [fundResult, positionsResult] = await Promise.all([
    supabase.from("funds").select("code, asset, name").eq("id", fundId).maybeSingle(),
    supabase
      .from("investor_positions")
      .select("current_value, investor_id")
      .eq("fund_id", fundId)
      .eq("is_active", true)
      .gt("current_value", 0),
  ]);

  // Filter to only investor account types (exclude ib, fees_account)
  const investorIds = positionsResult.data?.map((p) => p.investor_id).filter(Boolean) || [];
  const { data: profiles } =
    investorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id")
          .in("id", investorIds)
          .eq("account_type", "investor")
      : { data: [] };

  const investorSet = new Set(profiles?.map((p) => p.id) || []);

  const fund = fundResult.data;
  const currentAUM =
    positionsResult.data
      ?.filter((p) => investorSet.has(p.investor_id))
      .reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;

  // Calculate gross yield amount from AUM difference (transactional) or defer to backend (reporting)
  const isReporting = purpose === "reporting";
  const parsedAum = typeof newTotalAUM === "string" ? parseFloat(newTotalAUM) : newTotalAUM;
  const newTotalAUMNum =
    typeof parsedAum === "number" && !Number.isNaN(parsedAum) ? parsedAum : currentAUM;
  const grossYieldAmount = isReporting ? 0 : newTotalAUMNum - currentAUM;
  if (!isReporting && grossYieldAmount < 0) {
    throw new Error("Yield must be non-negative (positive or zero).");
  }

  // Call ADB preview RPC (time-weighted allocation)
  const { data, error } = await callRPC("preview_adb_yield_distribution_v3", {
    p_fund_id: fundId,
    p_period_start: formatDateForDB(periodStartDate),
    p_period_end: formatDateForDB(periodEndDate),
    p_gross_yield_amount: grossYieldAmount,
    p_purpose: purpose,
  });

  if (error) {
    logError("yieldPreview.adb", error, {
      fundId,
      periodStart: formatDateForDB(periodStartDate),
      periodEnd: formatDateForDB(periodEndDate),
    });
    throw new Error(`Failed to preview yield: ${error.message}`);
  }

  const result = data as unknown as ADBYieldRPCResult;

  if (!result || !result.success) {
    throw new Error(result?.error || "Preview failed: Invalid response from server");
  }

  // Map distributions from ADB backend format
  // Field names match the RPC's JSONB output: adb_share_pct, gross_yield, net_yield, ib_rate
  const distributions: YieldDistribution[] = (result.allocations || []).map(
    (d: ADBAllocationItem) => ({
      investorId: d.investor_id,
      investorName: d.investor_name,
      accountType: d.account_type,
      currentBalance: String(d.adb || 0), // Use ADB as "current" context
      allocationPercentage: String(d.adb_share_pct || 0),
      feePercentage: String(d.fee_pct || 0),
      grossYield: String(d.gross_yield || 0),
      feeAmount: String(d.fee_amount || 0),
      netYield: String(d.net_yield || 0),
      newBalance: "0", // Not applicable for preview
      positionDelta: String(d.net_yield || 0),
      ibParentId: d.ib_parent_id,
      ibParentName: d.ib_parent_name,
      ibPercentage: String(d.ib_rate || 0),
      ibAmount: String(d.ib_amount || 0),
      referenceId: "",
      wouldSkip: false,
      // ADB-specific fields
      adb: String(d.adb || 0),
      adbWeight: String(Number(d.adb_share_pct || 0) / 100), // Convert % to decimal
      carriedLoss: String(d.carried_loss || 0),
      lossOffset: String(d.loss_offset || 0),
      taxableGain: String(d.taxable_gain || 0),
      hasIb: Boolean(d.ib_parent_id && (d.ib_rate || 0) > 0),
    })
  );

  // IB credits are computed separately in ADB model
  const ibCredits: IBCredit[] = [];

  // Extract totals from ADB response
  const totals: YieldTotals = {
    gross: String(result.gross_yield || grossYieldAmount),
    fees: String(result.total_fees || 0),
    ibFees: String(result.total_ib || 0),
    net: String(result.net_yield || 0),
    indigoCredit: String(result.total_fees || 0), // Platform fees = INDIGO credit
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
    currentAUM: String(currentAUM),
    newAUM: String(newTotalAUMNum),
    grossYield: String(result.gross_yield || grossYieldAmount),
    netYield: String(result.net_yield ?? totals.net),
    totalFees: String(result.total_fees ?? totals.fees),
    totalIbFees: String(result.total_ib ?? totals.ibFees),
    yieldPercentage: String(result.yield_rate_pct || 0),
    investorCount: Number(result.investor_count || distributions.length),
    distributions,
    ibCredits,
    indigoFeesCredit: totals.indigoCredit,
    indigoFeesId: undefined,
    existingConflicts: [],
    hasConflicts: false,
    totals,
    status: "preview",
    // ADB-specific fields
    periodStart: formatDateForDB(periodStartDate),
    periodEnd: formatDateForDB(periodEndDate),
    daysInPeriod: Number(result.days_in_period || 0),
    totalAdb: String(result.total_adb || 0),
    yieldRatePct: String(result.yield_rate_pct || 0),
    totalLossOffset: String(result.total_loss_offset || 0),
    dustAmount: String(result.dust_amount || 0),
    calculationMethod: "adb_v3",
    features: result.features || ["time_weighted", "loss_carryforward"],
    conservationCheck: Boolean(result.conservation_check),
  };
}
