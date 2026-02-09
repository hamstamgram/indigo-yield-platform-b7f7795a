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
import { rpc } from "@/lib/rpc/index";
import type { DepositCrystallizationResult } from "@/types/domains/fund";
import { generateUUID } from "@/lib/utils";

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
 * Uses live investor positions as opening AUM, and (newTotalAum - depositAmount)
 * as the closing AUM snapshot for crystallization.
 */
export async function previewDepositYield(
  fundId: string,
  depositAmount: string | number,
  newTotalAum: string | number,
  _txDate?: string
): Promise<YieldPreviewResult> {
  // Get fund info
  const { data: fund, error: fundError } = await supabase
    .from("funds")
    .select("code, asset")
    .eq("id", fundId)
    .maybeSingle();

  if (fundError) {
    throw new Error(`Failed to fetch fund: ${fundError.message}`);
  }

  if (!fund) {
    throw new Error("Fund not found");
  }

  const depositAmountDec = toDecimal(depositAmount).abs();
  const newTotalAumDec = toDecimal(newTotalAum);
  const closingAumBeforeDeposit = newTotalAumDec.minus(depositAmountDec);
  if (closingAumBeforeDeposit.isNegative()) {
    throw new Error("Invalid AUM inputs: newTotalAum must be >= depositAmount");
  }

  // Use live positions as opening AUM (replaces stale fund_aum_events checkpoint)
  const liveAum = await getCurrentFundAum(fundId);
  const openingAumDec = toDecimal(liveAum);

  const preDepositYieldDec = closingAumBeforeDeposit.minus(openingAumDec);
  const yieldPercentageDec = openingAumDec.gt(0)
    ? preDepositYieldDec.div(openingAumDec).times(100)
    : toDecimal(0);

  // Count active investors with positions in this fund
  const { count: activeInvestorCount } = await supabase
    .from("investor_positions")
    .select("investor_id", { count: "exact", head: true })
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  return {
    currentAum: openingAumDec.toFixed(10),
    preDepositYield: preDepositYieldDec.toFixed(10),
    yieldPercentage: yieldPercentageDec.toFixed(10),
    investorCount: activeInvestorCount ?? 0,
    fundAsset: fund.asset,
    fundCode: fund.code,
  };
}

/**
 * Process a deposit with yield distribution
 *
 * Steps:
 * 1. Compute crystallization closing snapshot = (newTotalAum - amount)
 * 2. Call apply_transaction_with_crystallization (crystallize first, then deposit)
 */
export async function processDepositWithYield(
  params: DepositWithYieldParams
): Promise<DepositWithYieldResult> {
  const { investorId, fundId, amount, newTotalAum, txDate, notes, txHash } = params;

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
    const triggerReference = (
      txHash || `deposit_yield:${txDate}:${investorId}:${generateUUID()}`
    ).replace(/^DEP:/, "");
    const amountFixed = amountDec.toFixed(10);
    const closingAumBeforeDepositFixed = closingAumBeforeDeposit.toFixed(10);

    const rpcResult = await rpc.call("apply_transaction_with_crystallization", {
      p_fund_id: fundId,
      p_investor_id: investorId,
      p_tx_type: "DEPOSIT",
      p_amount: Number(amountFixed),
      p_tx_date: txDate,
      p_reference_id: triggerReference,
      p_new_total_aum: Number(closingAumBeforeDepositFixed),
      p_admin_id: user.id,
      p_notes: notes || `Deposit with yield crystallization - ${triggerReference}`,
      p_purpose: "transaction",
    });

    if (rpcResult.error) {
      logError("processDepositWithYield", rpcResult.error, { fundId, investorId });
      return {
        success: false,
        yieldDistributed: 0,
        yieldInvestorsAffected: 0,
        depositProcessed: false,
        error: `Deposit failed: ${rpcResult.error.message}`,
      };
    }

    const result = rpcResult.data as unknown as DepositCrystallizationResult | null;
    const grossYield = Number(result?.crystallization?.gross_yield || 0);

    return {
      success: true,
      yieldDistributed: grossYield,
      yieldInvestorsAffected: result?.crystallization?.investors_affected || 0,
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
 * Get current fund AUM from fund_daily_aum (transaction purpose).
 * Falls back to ALL active positions if no snapshot exists (new fund).
 */
export async function getCurrentFundAum(fundId: string): Promise<number> {
  const { data, error } = await supabase
    .from("fund_daily_aum")
    .select("total_aum")
    .eq("fund_id", fundId)
    .eq("purpose", "transaction")
    .eq("is_voided", false)
    .order("aum_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch AUM: ${error.message}`);

  if (data) return Number(data.total_aum);

  // Fallback: sum ALL active positions (new fund with no AUM history)
  const { data: positions, error: posError } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fundId)
    .eq("is_active", true)
    .gt("current_value", 0);

  if (posError) throw new Error(`Failed to fetch positions: ${posError.message}`);
  return (positions || []).reduce((sum, p) => sum + Number(p.current_value || 0), 0);
}
