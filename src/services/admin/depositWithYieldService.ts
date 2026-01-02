/**
 * Deposit with Yield Distribution Service
 * 
 * Handles the combined operation of:
 * 1. Calculating and distributing yield based on AUM change
 * 2. Processing the deposit transaction
 * 
 * The yield is distributed to ALL existing investors BEFORE the deposit is processed.
 */

import { supabase } from "@/integrations/supabase/client";

export interface DepositWithYieldParams {
  investorId: string;
  fundId: string;
  amount: number;
  newTotalAum: number;
  txDate: string;
  notes?: string;
  txHash?: string;
}

export interface YieldPreviewResult {
  currentAum: number;
  preDepositYield: number;
  yieldPercentage: number;
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
 * Formula: preDepositYield = newTotalAum - currentAum - depositAmount
 * 
 * This shows the yield earned by existing investors BEFORE the new deposit is added.
 */
export async function previewDepositYield(
  fundId: string,
  depositAmount: number,
  newTotalAum: number
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

  // Get current AUM from positions
  const { data: positions, error: posError } = await supabase
    .from("investor_positions")
    .select("current_value, investor_id")
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  if (posError) {
    throw new Error(`Failed to fetch positions: ${posError.message}`);
  }

  const currentAum = positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;
  
  // Calculate pre-deposit yield
  // newTotalAum = currentAum + yield + depositAmount
  // Therefore: yield = newTotalAum - currentAum - depositAmount
  const preDepositYield = newTotalAum - currentAum - depositAmount;
  
  const yieldPercentage = currentAum > 0 ? (preDepositYield / currentAum) * 100 : 0;

  return {
    currentAum,
    preDepositYield,
    yieldPercentage,
    investorCount: positions?.length || 0,
    fundAsset: fund.asset,
    fundCode: fund.code,
  };
}

/**
 * Process a deposit with yield distribution
 * 
 * Steps:
 * 1. Calculate yield from AUM difference (before deposit)
 * 2. If yield > 0, distribute to all existing investors
 * 3. Process the deposit transaction
 * 4. Record new AUM
 */
export async function processDepositWithYield(
  params: DepositWithYieldParams
): Promise<DepositWithYieldResult> {
  const { investorId, fundId, amount, newTotalAum, txDate, notes, txHash } = params;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, yieldDistributed: 0, yieldInvestorsAffected: 0, depositProcessed: false, error: "Not authenticated" };
  }

  // Get current AUM from positions
  const { data: positions, error: posError } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  if (posError) {
    return { success: false, yieldDistributed: 0, yieldInvestorsAffected: 0, depositProcessed: false, error: posError.message };
  }

  const currentAum = positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;
  
  // Calculate pre-deposit yield
  const preDepositYield = newTotalAum - currentAum - amount;
  
  let yieldDistributed = 0;
  let yieldInvestorsAffected = 0;

  // Step 1: If there's yield to distribute, do it first
  if (preDepositYield > 0) {
    try {
      const { data: yieldResult, error: yieldError } = await (supabase.rpc as any)("apply_daily_yield_to_fund_v2", {
        p_fund_id: fundId,
        p_date: txDate,
        p_gross_amount: preDepositYield,
        p_admin_id: user.id,
        p_purpose: "transaction",
      });

      if (yieldError) {
        console.error("Yield distribution error:", yieldError);
        return { 
          success: false, 
          yieldDistributed: 0, 
          yieldInvestorsAffected: 0, 
          depositProcessed: false, 
          error: `Yield distribution failed: ${yieldError.message}` 
        };
      }

      yieldDistributed = preDepositYield;
      yieldInvestorsAffected = yieldResult?.investors_updated || positions?.length || 0;
      console.log(`Yield distributed: ${preDepositYield} to ${yieldInvestorsAffected} investors`);
    } catch (err) {
      console.error("Yield distribution exception:", err);
      return { 
        success: false, 
        yieldDistributed: 0, 
        yieldInvestorsAffected: 0, 
        depositProcessed: false, 
        error: `Yield distribution exception: ${err}` 
      };
    }
  }

  // Step 2: Process the deposit
  // Check if investor already has a position
  const { data: existingPosition } = await supabase
    .from("investor_positions")
    .select("investor_id, current_value")
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .maybeSingle();

  const isFirstInvestment = !existingPosition || Number(existingPosition.current_value) === 0;
  const transactionType = isFirstInvestment ? "FIRST_INVESTMENT" : "DEPOSIT";

  try {
    // Use the adjust_investor_position RPC for the deposit
    const { data: depositResult, error: depositError } = await (supabase.rpc as any)("adjust_investor_position", {
      p_investor_id: investorId,
      p_fund_id: fundId,
      p_amount: amount,
      p_notes: notes || `${transactionType} with yield distribution`,
      p_admin_id: user.id,
      p_tx_type: transactionType,
      p_tx_date: txDate,
      p_reference_id: txHash || `deposit_yield:${Date.now()}`,
    });

    if (depositError) {
      console.error("Deposit error:", depositError);
      return { 
        success: false, 
        yieldDistributed, 
        yieldInvestorsAffected, 
        depositProcessed: false, 
        error: `Deposit failed: ${depositError.message}` 
      };
    }

    // Step 3: Record new AUM
    const { error: aumError } = await supabase
      .from("fund_daily_aum")
      .upsert({
        fund_id: fundId,
        aum_date: txDate,
        total_aum: newTotalAum,
        source: "deposit_with_yield",
        created_by: user.id,
        purpose: "transaction",
      }, {
        onConflict: "fund_id,aum_date,purpose",
      });

    if (aumError) {
      console.warn("AUM recording warning:", aumError);
      // Don't fail the entire operation for AUM recording issues
    }

    return {
      success: true,
      yieldDistributed,
      yieldInvestorsAffected,
      depositProcessed: true,
      transactionId: depositResult?.transaction_id,
    };
  } catch (err) {
    console.error("Deposit exception:", err);
    return { 
      success: false, 
      yieldDistributed, 
      yieldInvestorsAffected, 
      depositProcessed: false, 
      error: `Deposit exception: ${err}` 
    };
  }
}

/**
 * Get current fund AUM from positions
 */
export async function getCurrentFundAum(fundId: string): Promise<number> {
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  if (error) {
    throw new Error(`Failed to fetch positions: ${error.message}`);
  }

  return positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;
}
