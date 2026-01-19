/**
 * Deposit with Yield Distribution Service
 *
 * Implements crystallize-before-flow accounting:
 * - Crystallize yield up to the flow event using an authoritative AUM snapshot
 * - Apply the DEPOSIT afterwards (same DB transaction)
 */

import { supabase } from "@/integrations/supabase/client";
import { toDecimal } from "@/utils/financial";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";

export interface DepositWithYieldParams {
  investorId: string;
  fundId: string;
  amount: string | number;
  /**
   * Authoritative AUM snapshot AFTER the deposit is applied (admin input).
   * The crystallization snapshot used is (newTotalAum - amount) to ensure
   * "crystallize before flows".
   */
  newTotalAum: string | number;
  txDate: string;
  notes?: string;
  txHash?: string;
}

export interface YieldPreviewResult {
  currentAum: string;
  preDepositYield: string;
  yieldPercentage: string;
  investorCount: number;
  fundAsset: string;
  fundCode: string;
}

export interface DepositWithYieldResult {
  success: boolean;
  yieldDistributed: number;
  yieldInvestorsAffected: number;
  depositProcessed: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Preview the yield that will be distributed before a deposit
 *
 * Uses last fund_aum_events checkpoint as opening AUM, and (newTotalAum - depositAmount)
 * as the closing AUM snapshot for crystallization.
 */
export async function previewDepositYield(
  fundId: string,
  depositAmount: string | number,
  newTotalAum: string | number
): Promise<YieldPreviewResult> {
  // Get fund info
  const { data: fund, error: fundError } = await supabase
    .from("funds")
    .select("code, asset")
    .eq("id", fundId)
    .single();

  if (fundError || !fund) {
    throw new Error("Fund not found");
  }

  const depositAmountDec = toDecimal(depositAmount).abs();
  const newTotalAumDec = toDecimal(newTotalAum);
  const closingAumBeforeDeposit = newTotalAumDec.minus(depositAmountDec);
  if (closingAumBeforeDeposit.isNegative()) {
    throw new Error("Invalid AUM inputs: newTotalAum must be >= depositAmount");
  }

  const { data: lastCheckpoint } = await (supabase.from as any)("fund_aum_events")
    .select("closing_aum, post_flow_aum, event_ts")
    .eq("fund_id", fundId)
    .eq("is_voided", false)
    .order("event_ts", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Use post_flow_aum if available (for accurate yield calculation), otherwise closing_aum
  const openingAumDec = lastCheckpoint?.post_flow_aum
    ? toDecimal(lastCheckpoint.post_flow_aum)
    : lastCheckpoint?.closing_aum
      ? toDecimal(lastCheckpoint.closing_aum)
      : closingAumBeforeDeposit;
  const preDepositYieldDec = closingAumBeforeDeposit.minus(openingAumDec);
  const yieldPercentageDec = openingAumDec.gt(0)
    ? preDepositYieldDec.div(openingAumDec).times(100)
    : toDecimal(0);

  return {
    currentAum: openingAumDec.toFixed(10),
    preDepositYield: preDepositYieldDec.toFixed(10),
    yieldPercentage: yieldPercentageDec.toFixed(10),
    investorCount: 0,
    fundAsset: fund.asset,
    fundCode: fund.code,
  };
}

/**
 * Process a deposit with yield distribution
 *
 * Steps:
 * 1. Compute crystallization closing snapshot = (newTotalAum - amount)
 * 2. Call apply_deposit_with_crystallization (crystallize first, then deposit)
 */
export async function processDepositWithYield(
  params: DepositWithYieldParams
): Promise<DepositWithYieldResult> {
  const { investorId, fundId, amount, newTotalAum, txDate, notes, txHash } = params;
  void notes;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      yieldDistributed: 0,
      yieldInvestorsAffected: 0,
      depositProcessed: false,
      error: "Not authenticated",
    };
  }

  const amountDec = toDecimal(amount).abs();
  const newTotalAumDec = toDecimal(newTotalAum);
  const closingAumBeforeDeposit = newTotalAumDec.minus(amountDec);
  if (closingAumBeforeDeposit.isNegative()) {
    return {
      success: false,
      yieldDistributed: 0,
      yieldInvestorsAffected: 0,
      depositProcessed: false,
      error: "Invalid AUM inputs: newTotalAum must be >= deposit amount",
    };
  }

  try {
    const triggerReference = (txHash || `deposit_yield:${Date.now()}`).replace(/^DEP:/, "");
    const amountFixed = amountDec.toFixed(10);
    const newTotalAumFixed = newTotalAumDec.toFixed(10);

    const { data: depositResult, error: depositError } = await callRPC(
      "apply_deposit_with_crystallization",
      {
        p_fund_id: fundId,
        p_investor_id: investorId,
        p_amount: Number(amountFixed),
        p_closing_aum: Number(newTotalAumFixed),
        p_effective_date: txDate,
        p_admin_id: user.id,
        p_notes: notes || `Deposit with yield crystallization - ${triggerReference}`,
        p_purpose: "transaction",
      }
    );

    if (depositError) {
      logError("processDepositWithYield", depositError, { fundId, investorId });
      return {
        success: false,
        yieldDistributed: 0,
        yieldInvestorsAffected: 0,
        depositProcessed: false,
        error: `Deposit failed: ${depositError.message}`,
      };
    }

    const result = depositResult as any;
    const grossYield = Number(result?.crystallization?.gross_yield || 0);

    return {
      success: true,
      yieldDistributed: grossYield,
      yieldInvestorsAffected: 0,
      depositProcessed: true,
      transactionId: result?.deposit_tx_id,
    };
  } catch (err) {
    logError("processDepositWithYield.exception", err, { fundId, investorId });
    return {
      success: false,
      yieldDistributed: 0,
      yieldInvestorsAffected: 0,
      depositProcessed: false,
      error: `Deposit exception: ${err}`,
    };
  }
}

/**
 * Get current fund AUM from positions (investor accounts only)
 */
export async function getCurrentFundAum(fundId: string): Promise<number> {
  // Fetch positions with balance filter
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select("investor_id, current_value")
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  if (error) {
    throw new Error(`Failed to fetch positions: ${error.message}`);
  }

  // Fetch investor profiles to filter by account_type
  const investorIds = [...new Set((positions || []).map(p => p.investor_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, account_type")
    .in("id", investorIds.length > 0 ? investorIds : ['none']);

  const investorSet = new Set(
    (profiles || [])
      .filter(p => p.account_type === 'investor')
      .map(p => p.id)
  );

  // Filter to investor accounts only
  const investorPositions = (positions || []).filter(p => investorSet.has(p.investor_id));

  return investorPositions.reduce((sum, p) => sum + Number(p.current_value || 0), 0);
}
