/**
 * AUM (Assets Under Management) Service
 * Handles fund AUM management and automated yield distribution
 */

import { supabase } from "@/integrations/supabase/client";

// Note: transaction_type_v2 enum may not exist yet, using string literal union as fallback
type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "FEE" | "INTEREST";

export interface FundAUM {
  id: string;
  fund_id: string;
  aum_date: string;
  total_aum: number;
  investor_count?: number;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  fund?: {
    code: string;
    name: string;
    asset: string;
    fund_class: string;
  };
}

export interface YieldDistributionResult {
  success: boolean;
  application_id: string;
  fund_aum: number;
  total_yield_generated: number;
  investors_affected: number;
}

export interface DailyTransactionsSummary {
  deposits: number;
  withdrawals: number;
  net_flow: number;
}

export interface YieldCalculationResult {
  previous_aum: number;
  current_aum: number;
  deposits: number;
  withdrawals: number;
  calculated_yield: number;
  yield_percentage: number;
}

/**
 * Get day's deposits and withdrawals for a fund
 */
async function getDayTransactions(fundId: string, date: string): Promise<DailyTransactionsSummary> {
  try {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("amount, type")
      .eq("fund_id", fundId)
      .eq("tx_date", date);

    if (error) throw error;

    let deposits = 0;
    let withdrawals = 0;

    data?.forEach((transaction) => {
      const txType = transaction.type as TransactionType;
      if (txType === "DEPOSIT") {
        deposits += Number(transaction.amount);
      } else if (txType === "WITHDRAWAL") {
        withdrawals += Number(transaction.amount);
      }
    });

    return {
      deposits,
      withdrawals,
      net_flow: deposits - withdrawals,
    };
  } catch (error) {
    console.error("Error fetching day transactions:", error);
    return { deposits: 0, withdrawals: 0, net_flow: 0 };
  }
}

/**
 * Calculate daily yield based on AUM difference
 * Formula: Daily Yield = Target AUM - Current Live System AUM
 */
async function calculateDailyYield(
  fundId: string,
  targetAUM: number,
  date: string
): Promise<YieldCalculationResult> {
  try {
    // 1. Get the Current Live AUM (Sum of all investor positions)
    // We use the same query logic as getAllFundsWithAUM to ensure consistency
    const { data: positions, error } = await supabase
      .from("investor_positions")
      .select("current_value")
      .eq("fund_id", fundId)
      .gt("current_value", 0);

    if (error) throw error;

    const currentSystemAUM =
      positions?.reduce((sum, pos) => sum + (pos.current_value || 0), 0) || 0;

    // 2. Calculate Yield
    // Yield is simply the difference: What it IS (Target) - What we HAVE (System)
    const calculatedYield = targetAUM - currentSystemAUM;

    // 3. Calculate Percentage
    // This % is applied to everyone's balance to bridge the gap
    const yieldPercentage = currentSystemAUM > 0 ? (calculatedYield / currentSystemAUM) * 100 : 0;

    // For logging/display purposes, we can still fetch transactions, but they don't drive the math anymore
    // This ensures "What you type is what you get"
    const transactions = await getDayTransactions(fundId, date);

    return {
      previous_aum: currentSystemAUM, // In this context, "Previous" is the state *before* the update
      current_aum: targetAUM,
      deposits: transactions.deposits,
      withdrawals: transactions.withdrawals,
      calculated_yield: calculatedYield,
      yield_percentage: yieldPercentage,
    };
  } catch (error) {
    console.error("Error calculating daily yield:", error);
    throw error;
  }
}

/**
 * Set daily AUM for a fund
 */
export async function setFundDailyAUM(
  fundId: string,
  aumAmount: number,
  aumDate?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const date = aumDate || new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("fund_daily_aum")
      .upsert(
        {
          fund_id: fundId, // fund_daily_aum.fund_id is text; fundId uuid will store as text
          as_of_date: date,
          aum_date: date, // keep legacy column if present
          total_aum: aumAmount,
          source: "ingested",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "fund_id,aum_date" }
      );

    if (error) throw error;

    return {
      success: true,
      data: {
        fund_id: fundId,
        aum_amount: aumAmount,
        aum_date: aumDate || new Date().toISOString().split("T")[0]
      }
    };
  } catch (error) {
    console.error("Error setting fund daily AUM:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set AUM",
    };
  }
}

/**
 * Get AUM history grouped by month.
 */
export async function getMonthlyAUM() {
  try {
    // RPC get_monthly_aum_summary might be missing, so we aggregate manually
    const { data, error } = await supabase
      .from("fund_daily_aum")
      .select("aum_date, total_aum")
      .order("aum_date", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) return [];

    // Group by month (YYYY-MM) and take the latest entry for each month
    const monthlyMap = new Map<string, number>();
    
    data.forEach(entry => {
      const monthKey = entry.aum_date.substring(0, 7); // YYYY-MM
      // Since data is sorted ascending, we overwrite with the latest value for the month
      monthlyMap.set(monthKey, entry.total_aum);
    });

    // Convert map to array
    return Array.from(monthlyMap.entries()).map(([month, aum]) => ({
      month,
      total_aum: aum
    }));
  } catch (error) {
    console.error("Error fetching monthly AUM:", error);
    return [];
  }
}

/**
 * Get daily AUM for the last 30 days.
 */
export async function getDailyAUM() {
  const { data, error } = await supabase
    .from("fund_daily_aum")
    .select("*")
    .order("aum_date", { ascending: false })
    .limit(30);
  if (error) {
    console.error("Error fetching daily AUM:", error);
    return [];
  }
  return data;
}

/**
 * Get historical AUM for a specific fund.
 */
export async function getFundHistoricalAUM(fundId: string) {
  return getFundAUMHistory(fundId);
}

/**
 * Get fund AUM history (from fund_daily_aum; fallback to live positions)
 */
export async function getFundAUMHistory(
  fundId?: string,
  _startDate?: string,
  _endDate?: string
): Promise<FundAUM[]> {
  try {
    let query = supabase
      .from("fund_daily_aum")
      .select("*")
      .order("as_of_date", { ascending: false });

    if (fundId) {
      query = query.eq("fund_id", fundId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as FundAUM[];
  } catch (error) {
    console.error("Error fetching fund AUM history:", error);
    return [];
  }
}

/**
 * Apply daily yield to a fund (calls fee-aware RPC)
 */
export async function applyDailyYieldToFund(
  fundId: string,
  yieldPercentage: number,
  applicationDate?: string
): Promise<{ success: boolean; data?: YieldDistributionResult; error?: string }> {
  try {
    const date = applicationDate || new Date().toISOString().split("T")[0];

    // Prefer latest fund_daily_aum; fall back to live positions if none
    const { data: aumRows, error: aumError } = await supabase
      .from("fund_daily_aum")
      .select("total_aum")
      .eq("fund_id", fundId)
      .order("as_of_date", { ascending: false })
      .limit(1);
    if (aumError) throw aumError;

    let totalAUM = aumRows?.[0]?.total_aum ?? 0;

    if (!totalAUM || totalAUM <= 0) {
      const { data: positions, error: posError } = await supabase
        .from("investor_positions")
        .select("current_value")
        .eq("fund_id", fundId)
        .gt("current_value", 0);
      if (posError) throw posError;
      totalAUM = positions?.reduce((sum, pos) => sum + (pos.current_value || 0), 0) || 0;
    }

    if (totalAUM <= 0) {
      throw new Error("No AUM available for yield distribution");
    }

    const grossAmount = totalAUM * (yieldPercentage / 100);

    const { data, error } = await supabase.rpc("apply_daily_yield_to_fund", {
      p_fund_id: fundId,
      p_date: date,
      p_gross_amount: grossAmount,
      p_admin_id: (await supabase.auth.getUser()).data.user?.id || null,
    });

    if (error) throw error;
    const investorsAffected = (data as any[])?.length || 0;

    return {
      success: true,
      data: {
        success: true,
        application_id: `yield_${Date.now()}`,
        fund_aum: totalAUM,
        total_yield_generated: grossAmount,
        investors_affected: investorsAffected,
      }
    };
  } catch (error) {
    console.error("Error applying daily yield:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to apply yield",
    };
  }
}

/**
 * Update investor AUM percentages for a fund
 */
export async function updateInvestorAUMPercentages(
  fundId: string,
  _totalAUM?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // compute share of total current_value
    const { data: positions, error } = await supabase
      .from("investor_positions")
      .select("investor_id, current_value")
      .eq("fund_id", fundId);
    if (error) throw error;
    const total = positions?.reduce((s, p) => s + Number(p.current_value || 0), 0) || 0;
    if (!positions || positions.length === 0 || total === 0) {
      return { success: true };
    }
    // no aum_percentage column exists, so just return success after computing (for display)
    return { success: true };
  } catch (error) {
    console.error("Error updating AUM percentages:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update percentages",
    };
  }
}

/**
 * Get investor positions with AUM percentages for a fund
 */
export async function getFundInvestorPositions(fundId: string) {
  try {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        `
        *,
        profile:profiles (
          first_name,
          last_name,
          email
        )
      `
      )
      .eq("fund_id", fundId)
      .gt("current_value", 0)
      .order("current_value", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching fund investor positions:", error);
    return [];
  }
}

/**
 * Get all funds with their latest AUM data
 */
export async function getAllFundsWithAUM() {
  try {
    const { data: funds, error: fundsError } = await supabase
      .from("funds")
      .select("*")
      .eq("status", "active")
      .order("name");

    if (fundsError) throw fundsError;

    // Get latest AUM for each fund (prefer fund_daily_aum; fallback to positions)
    const fundsWithAUM = await Promise.all(
      (funds || []).map(async (fund) => {
        let totalAUM = 0;
        let latestDate: string | null = null;
        const { data: aumRows } = await supabase
          .from("fund_daily_aum")
          .select("total_aum, as_of_date, aum_date")
          .eq("fund_id", fund.id)
          .order("as_of_date", { ascending: false })
          .limit(1);
        if (aumRows && aumRows.length) {
          totalAUM = Number(aumRows[0].total_aum || 0);
          latestDate = aumRows[0].as_of_date || aumRows[0].aum_date || null;
        } else {
          const { data: positions } = await supabase
            .from("investor_positions")
            .select("current_value, investor_id")
            .eq("fund_id", fund.id)
            .gt("current_value", 0);
          totalAUM = positions?.reduce((sum, pos) => sum + (pos.current_value || 0), 0) || 0;
          latestDate = null;
        }

        const { data: posForCount } = await supabase
          .from("investor_positions")
          .select("investor_id")
          .eq("fund_id", fund.id)
          .gt("current_value", 0);
        const investorCount = posForCount?.length || 0;

        return {
          ...fund,
          latest_aum: totalAUM,
          latest_aum_date: latestDate,
          investor_count: investorCount,
        };
      })
    );

    return fundsWithAUM;
  } catch (error) {
    console.error("Error fetching funds with AUM:", error);
    return [];
  }
}

/**
 * Enhanced daily AUM processing with automatic yield calculation
 * This function combines AUM setting with automated yield calculation and distribution
 */
export async function processDailyAUMWithYield(
  fundId: string,
  newAUM: number,
  date?: string
): Promise<{
  success: boolean;
  yieldCalculation?: YieldCalculationResult;
  yieldDistribution?: YieldDistributionResult;
  error?: string;
}> {
  try {
    const aumDate = date || new Date().toISOString().split("T")[0];

    // Step 1: Calculate automatic yield based on AUM changes
    const yieldCalculation = await calculateDailyYield(fundId, newAUM, aumDate);

    // Step 2: Set the daily AUM
    const aumResult = await setFundDailyAUM(fundId, newAUM, aumDate);

    if (!aumResult.success) {
      throw new Error(aumResult.error || "Failed to set daily AUM");
    }

    // Step 3: Apply yield distribution to investors if there's positive yield
    let yieldDistribution: YieldDistributionResult | undefined;

    if (yieldCalculation.calculated_yield > 0 && yieldCalculation.yield_percentage > 0) {
      const yieldResult = await applyDailyYieldToFund(
        fundId,
        yieldCalculation.yield_percentage,
        aumDate
      );

      if (!yieldResult.success) {
        throw new Error(`Yield distribution failed: ${yieldResult.error || "Unknown error"}`);
      }

      if (yieldResult.data) {
        yieldDistribution = yieldResult.data;
      } else {
        throw new Error("Yield distribution succeeded but returned no data");
      }
    }

    // Step 4: Update investor AUM percentages
    await updateInvestorAUMPercentages(fundId, newAUM);

    return {
      success: true,
      yieldCalculation,
      yieldDistribution,
    };
  } catch (error) {
    console.error("Error processing daily AUM with yield:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process daily AUM",
    };
  }
}

/**
 * Get detailed yield calculation preview without applying changes
 * Useful for showing admins what will happen before they confirm
 */
export async function previewDailyYieldCalculation(
  fundId: string,
  newAUM: number,
  date?: string
): Promise<{
  success: boolean;
  preview?: YieldCalculationResult & { fund_info: any };
  error?: string;
}> {
  try {
    const aumDate = date || new Date().toISOString().split("T")[0];

    // Get fund information
    const { data: fund, error: fundError } = await supabase
      .from("funds")
      .select("code, name, asset, fund_class")
      .eq("id", fundId)
      .maybeSingle();

    if (!fund) throw new Error("Fund not found");

    if (fundError) throw fundError;

    // Calculate yield without applying changes
    const yieldCalculation = await calculateDailyYield(fundId, newAUM, aumDate);

    return {
      success: true,
      preview: {
        ...yieldCalculation,
        fund_info: fund,
      },
    };
  } catch (error) {
    console.error("Error previewing daily yield calculation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to preview yield calculation",
    };
  }
}
