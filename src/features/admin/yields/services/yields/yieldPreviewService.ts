/**
 * Yield Preview Service
 * Uses the pure indigo-engine for yield distribution preview.
 * Previously used V5 PostgreSQL RPC — now delegates to the TypeScript engine.
 */

import { formatDateForDB } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";
import { previewYield as enginePreview } from "@/services/core/engineAdapterService";

import type {
  YieldCalculationInput,
  YieldDistribution,
  IBCredit,
  YieldTotals,
  YieldCalculationResult,
} from "@/types/domains/yield";

// UUID validation regex
/**
 * Preview yield distribution using the pure indigo-engine.
 * This is a read-only operation that returns computed distributions.
 */
export async function previewYieldDistribution(
  input: YieldCalculationInput
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM, purpose = "transaction" } = input;

  const parsedAum = newTotalAUM != null ? parseFinancial(newTotalAUM) : null;
  if (!parsedAum || parsedAum.isNaN() || parsedAum.lte(0)) {
    throw new Error("Recorded AUM must be a positive number.");
  }

  const engResult = await enginePreview({
    fundId,
    recordedAUM: parsedAum.toString(),
    purpose,
    date: formatDateForDB(targetDate),
  });

  if (!engResult.success) {
    throw new Error("Preview failed");
  }

  // Map engine distributions to existing YieldDistribution format
  const distributions: YieldDistribution[] = engResult.distributions.map((d) => ({
    investorId: d.investorId,
    investorName: d.investorName,
    accountType: d.accountType,
    currentBalance: d.openingBalance,
    allocationPercentage: d.allocationPct,
    feePercentage: d.feePct,
    grossYield: d.grossYield,
    feeAmount: d.feeAmount,
    netYield: d.netYield,
    newBalance: d.newBalance,
    positionDelta: d.netYield,
    ibParentId: d.ibId,
    ibParentName: d.ibName,
    ibPercentage: d.ibPct,
    ibAmount: d.ibAmount,
    referenceId: "",
    wouldSkip: false,
    hasIb: Boolean(d.ibId && parseFinancial(d.ibAmount).gt(0)),
    openingBalance: d.openingBalance,
  }));

  return {
    success: true,
    preview: true,
    fundId: engResult.fundId,
    fundCode: engResult.fundCode || "",
    fundAsset: engResult.fundAsset || "",
    yieldDate: targetDate,
    effectiveDate: formatDateForDB(targetDate),
    purpose,
    isMonthEnd: purpose === "reporting",
    currentAUM: engResult.openingAUM,
    newAUM: engResult.recordedAUM,
    grossYield: engResult.totals.grossYield,
    netYield: engResult.totals.netYield,
    totalFees: engResult.totals.totalFees,
    totalIbFees: engResult.totals.totalIb,
    yieldPercentage: parseFinancial(engResult.openingAUM).gt(0)
      ? parseFinancial(engResult.totals.grossYield).div(parseFinancial(engResult.openingAUM)).times(100).toString()
      : "0",
    investorCount: engResult.distributions.length,
    distributions,
    ibCredits: engResult.ibCredits.map((c) => ({
      ibId: c.ibId,
      ibName: c.ibName,
      amount: c.amount,
      investorId: c.ibId,
      investorName: c.ibName,
      feeAmount: "0",
      grossAmount: c.amount,
      netAmount: c.amount,
    })),
    indigoFeesCredit: engResult.indigoFeesCredit,
    existingConflicts: [],
    hasConflicts: false,
    totals: {
      gross: engResult.totals.grossYield,
      fees: engResult.totals.totalFees,
      ibFees: engResult.totals.totalIb,
      net: engResult.totals.netYield,
      indigoCredit: engResult.indigoFeesCredit,
    },
    status: "preview",
    periodStart: engResult.totals.openingAUM,
    periodEnd: engResult.totals.recordedAUM,
    daysInPeriod: 0,
    dustAmount: "0",
    calculationMethod: "engine_v1",
    features: ["event_sourcing"],
    conservationCheck: true,
    openingAum: engResult.openingAUM,
    recordedAum: engResult.recordedAUM,
    crystalsInPeriod: 0,
  };
}
