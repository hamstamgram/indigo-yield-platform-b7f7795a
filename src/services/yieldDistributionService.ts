/**
 * Yield Distribution Service
 * Handles daily yield entry, preview, and distribution across investor positions
 * All values are in NATIVE TOKENS (BTC, ETH, USDT, etc.) - never fiat
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Types
// ============================================================================

export interface YieldCalculationInput {
  fundId: string;
  targetDate: Date;
  newTotalAUM: number;
}

export interface YieldDistribution {
  investorId: string;
  investorName: string;
  currentBalance: number;
  allocationPercentage: number;
  feePercentage: number;
  grossYield: number;
  feeAmount: number;
  netYield: number;
  newBalance: number;
}

export interface YieldCalculationResult {
  success: boolean;
  preview?: boolean;
  error?: string;
  fundId: string;
  fundCode: string;
  fundAsset: string;
  yieldDate?: Date;
  currentAUM: number;
  newAUM: number;
  grossYield: number;
  netYield: number;
  totalFees: number;
  yieldPercentage: number;
  investorCount: number;
  distributions: YieldDistribution[];
  status: "preview" | "applied";
}

// Align with actual fund_daily_aum table
export interface FundDailyAUM {
  id: string;
  fund_id: string;
  aum_date: string;
  as_of_date?: string;
  total_aum: number;
  nav_per_share?: number | null;
  total_shares?: number | null;
  source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Preview yield distribution without applying changes.
 * Backend preview RPC is unavailable; compute a simple preview from AUM delta.
 */
export async function previewYieldDistribution(
  input: YieldCalculationInput
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM } = input;

  // Get investor positions for the fund
  const { data: positions, error: posError } = await supabase
    .from("investor_positions")
    .select(
      `
        investor_id,
        current_value,
        fund_class,
        shares,
        profile:profiles(first_name,last_name,email)
      `
    )
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  if (posError) {
    console.error("Error fetching positions for preview:", posError);
    throw new Error(`Failed to preview yield: ${posError.message}`);
  }

  const currentAUM =
    positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;
  const grossYield = Math.max(newTotalAUM - currentAUM, 0);
  const yieldPercentage = currentAUM > 0 ? (grossYield / currentAUM) * 100 : 0;

  // Resolve fees per investor using helper RPC
  const distributions =
    (positions || []).length > 0 && currentAUM > 0
      ? await Promise.all(
          (positions || []).map(async (p) => {
            const allocation = Number(p.current_value || 0) / currentAUM;
            const gross = grossYield * allocation;
            let feePct = 0;
            try {
              const { data: feePctResult } = await (supabase.rpc as any)(
                "_resolve_investor_fee_pct",
                {
                  p_date: formatDate(targetDate),
                  p_fund_id: fundId,
                  p_investor_id: p.investor_id,
                }
              );
              feePct = Number(feePctResult || 0);
            } catch (e) {
              feePct = 0;
            }
            const feeAmount = gross * (feePct / 100);
            const net = gross - feeAmount;
            const profile = p.profile as any;
            const investorName =
              `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
              profile?.email ||
              p.investor_id;
            return {
              investorId: p.investor_id,
              investorName,
              currentBalance: Number(p.current_value || 0),
              allocationPercentage: allocation * 100,
              feePercentage: feePct,
              grossYield: gross,
              feeAmount,
              netYield: net,
              newBalance: Number(p.current_value || 0) + net,
            } as YieldDistribution;
          })
        )
      : [];

  const totalFees = distributions.reduce((s, d) => s + d.feeAmount, 0);
  const netYield = distributions.reduce((s, d) => s + d.netYield, 0);

  return {
    success: true,
    preview: true,
    fundId,
    fundCode: "",
    fundAsset: "",
    yieldDate: targetDate,
    currentAUM,
    newAUM: newTotalAUM,
    grossYield,
    netYield,
    totalFees,
    yieldPercentage,
    investorCount: distributions.length,
    distributions,
    status: "preview",
  };
}

/**
 * Apply yield distribution (calls RPC function)
 * This permanently updates investor positions and creates transactions
 */
export async function applyYieldDistribution(
  input: YieldCalculationInput,
  adminId: string
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM } = input;

  // First, calculate the gross yield (new AUM - current AUM)
  const { data: positions, error: posError } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  if (posError) {
    throw new Error(`Failed to fetch current positions: ${posError.message}`);
  }

  const currentAUM = positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;
  const grossYieldAmount = Math.max(newTotalAUM - currentAUM, 0);

  if (grossYieldAmount <= 0) {
    throw new Error("New AUM must be greater than current AUM to distribute yield");
  }

  // The RPC expects p_gross_amount as the yield to distribute, not new total AUM
  const { data, error } = await supabase.rpc("apply_daily_yield_to_fund", {
    p_fund_id: fundId,
    p_date: formatDate(targetDate),
    p_gross_amount: grossYieldAmount,
    p_admin_id: adminId,
  });

  if (error) {
    console.error("Error applying yield distribution:", error);
    throw new Error(`Failed to apply yield: ${error.message}`);
  }

  const distributions: YieldDistribution[] = (data as any[] | null || []).map((d) => ({
    investorId: d.investor_id,
    investorName: "",
    currentBalance: 0,
    allocationPercentage: 0,
    feePercentage: 0,
    grossYield: Number(d.gross_amount || 0),
    feeAmount: Number(d.fee_amount || 0),
    netYield: Number(d.net_amount || 0),
    newBalance: 0,
  }));

  const grossYield = distributions.reduce((s, d) => s + d.grossYield, 0);
  const totalFees = distributions.reduce((s, d) => s + d.feeAmount, 0);
  const netYield = distributions.reduce((s, d) => s + d.netYield, 0);

  return {
    success: true,
    fundId,
    fundCode: "",
    fundAsset: "",
    yieldDate: targetDate,
    currentAUM,
    newAUM: newTotalAUM,
    grossYield,
    netYield,
    totalFees,
    yieldPercentage: currentAUM > 0 ? (grossYield / currentAUM) * 100 : 0,
    investorCount: distributions.length,
    distributions,
    status: "applied",
  };
}

/**
 * Get historical AUM entries for a fund
 */
export async function getFundAUMHistory(
  fundId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FundDailyAUM[]> {
  let query = supabase
    .from("fund_daily_aum")
    .select("*")
    .eq("fund_id", fundId)
    .order("aum_date", { ascending: false });

  if (startDate) {
    query = query.gte("aum_date", formatDate(startDate));
  }
  if (endDate) {
    query = query.lte("aum_date", formatDate(endDate));
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching AUM history:", error);
    throw new Error(`Failed to fetch AUM history: ${error.message}`);
  }

  return (data as FundDailyAUM[]) || [];
}

/**
 * Get the latest AUM entry for a fund
 */
export async function getLatestFundAUM(fundId: string): Promise<FundDailyAUM | null> {
  const { data, error } = await supabase
    .from("fund_daily_aum")
    .select("*")
    .eq("fund_id", fundId)
    .order("aum_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching latest AUM:", error);
    return null;
  }

  return data as FundDailyAUM | null;
}

/**
 * Get current fund AUM calculated from investor positions
 */
export async function getCurrentFundAUM(fundId: string): Promise<{
  totalAUM: number;
  investorCount: number;
  lastUpdated: string | null;
}> {
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select("current_value, updated_at")
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  if (error) {
    console.error("Error fetching current AUM:", error);
    throw new Error(`Failed to fetch current AUM: ${error.message}`);
  }

  const totalAUM = positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;

  // Find the most recent update
  const lastUpdated =
    positions?.reduce((latest, p) => {
      if (!latest || (p.updated_at && p.updated_at > latest)) {
        return p.updated_at;
      }
      return latest;
    }, null as string | null) || null;

  return {
    totalAUM,
    investorCount: positions?.length || 0,
    lastUpdated,
  };
}

/**
 * Save a draft AUM entry (without distributing yield)
 */
export async function saveDraftAUMEntry(
  fundId: string,
  recordDate: Date,
  closingAUM: number,
  notes?: string,
  adminId?: string
): Promise<FundDailyAUM> {
  const { data, error } = await supabase
    .from("fund_daily_aum")
    .upsert(
      {
        fund_id: fundId,
        aum_date: formatDate(recordDate),
        as_of_date: formatDate(recordDate),
        total_aum: closingAUM,
        source: notes || "manual",
        created_by: adminId || null,
      },
      {
        onConflict: "fund_id,aum_date",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error saving draft AUM entry:", error);
    throw new Error(`Failed to save draft: ${error.message}`);
  }

  return data as FundDailyAUM;
}

/**
 * Get yield summary for a period
 */
export async function getYieldSummary(
  fundId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalGrossYield: number;
  totalNetYield: number;
  totalFees: number;
  avgYieldPercentage: number;
  entryCount: number;
}> {
  const { data, error } = await supabase
    .from("fund_daily_aum")
    .select("aum_date, total_aum")
    .eq("fund_id", fundId)
    .gte("aum_date", formatDate(startDate))
    .lte("aum_date", formatDate(endDate))
    .order("aum_date", { ascending: true });

  if (error) {
    console.error("Error fetching yield summary:", error);
    throw new Error(`Failed to fetch yield summary: ${error.message}`);
  }

  const entries = data || [];
  let totalGrossYield = 0;
  for (let i = 1; i < entries.length; i++) {
    const prev = Number(entries[i - 1].total_aum || 0);
    const curr = Number(entries[i].total_aum || 0);
    totalGrossYield += curr - prev;
  }

  return {
    totalGrossYield,
    totalNetYield: totalGrossYield, // fees tracked separately via fee schedule
    totalFees: 0,
    avgYieldPercentage:
      entries.length > 1
        ? (totalGrossYield / Number(entries[0].total_aum || 1)) * 100
        : 0,
    entryCount: entries.length,
  };
}
