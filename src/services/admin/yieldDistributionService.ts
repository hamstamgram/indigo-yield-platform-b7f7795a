/**
 * Yield Distribution Service
 * Handles daily yield entry, preview, and distribution across investor positions
 * All values are in NATIVE TOKENS (BTC, ETH, USDT, etc.) - never fiat
 * 
 * IMPORTANT: Preview now uses backend RPC for exact parity with apply
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  ensureSnapshotExists, 
  lockPeriodSnapshot, 
  isPeriodLocked,
  getFundPeriodSnapshot
} from "@/services/operations/snapshotService";

// ============================================================================
// Types
// ============================================================================

export interface YieldCalculationInput {
  fundId: string;
  targetDate: Date;
  newTotalAUM: number;
  purpose?: "reporting" | "transaction";
}

export interface YieldDistribution {
  investorId: string;
  investorName: string;
  accountType?: string;
  currentBalance: number;
  allocationPercentage: number;
  feePercentage: number;
  grossYield: number;
  feeAmount: number;
  netYield: number;
  newBalance: number;
  positionDelta: number;
  // IB fields
  ibParentId?: string;
  ibParentName?: string;
  ibPercentage: number;
  ibAmount: number;
  ibSource?: 'from_platform_fees' | 'from_investor_yield';
  // Idempotency
  referenceId: string;
  wouldSkip: boolean;
}

export interface IBCredit {
  ibInvestorId: string;
  ibInvestorName: string;
  sourceInvestorId: string;
  sourceInvestorName: string;
  amount: number;
  ibPercentage: number;
  source: string;
  referenceId: string;
  wouldSkip: boolean;
}

export interface YieldTotals {
  gross: number;
  fees: number;
  ibFees: number;
  net: number;
  indigoCredit: number;
}

export interface YieldCalculationResult {
  success: boolean;
  preview?: boolean;
  error?: string;
  fundId: string;
  fundCode: string;
  fundAsset: string;
  yieldDate?: Date;
  effectiveDate?: string;
  purpose?: string;
  isMonthEnd?: boolean;
  currentAUM: number;
  newAUM: number;
  grossYield: number;
  netYield: number;
  totalFees: number;
  totalIbFees: number;
  yieldPercentage: number;
  investorCount: number;
  distributions: YieldDistribution[];
  ibCredits: IBCredit[];
  indigoFeesCredit: number;
  indigoFeesId?: string;
  existingConflicts: string[];
  hasConflicts: boolean;
  totals: YieldTotals;
  status: "preview" | "applied";
  snapshotInfo?: {
    snapshotId: string;
    snapshotDate: string;
    isLocked: boolean;
    periodId?: string;
  };
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
 * Get period ID for a given date
 */
async function getPeriodIdForDate(targetDate: Date): Promise<string | null> {
  // Query using year and month columns (statement_periods doesn't have period_start_date/period_end_date)
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1; // JavaScript months are 0-indexed
  
  const { data, error } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  
  if (error || !data) {
    // Try to find the next available period
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
// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function previewYieldDistribution(
  input: YieldCalculationInput
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM, purpose = "reporting" } = input;

  // Validate fundId is a valid UUID to prevent "operator does not exist: uuid = text" errors
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

  // Get current AUM to calculate gross yield
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
    throw new Error("New AUM must be greater than current AUM to distribute yield");
  }

  // Get user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Authentication required");
  }

  // Call backend preview RPC with correct 4-parameter signature
  // DB function: preview_daily_yield_to_fund_v2(p_fund_id uuid, p_date date, p_gross_yield numeric, p_purpose text)
  const { data, error } = await (supabase.rpc as any)("preview_daily_yield_to_fund_v2", {
    p_fund_id: fundId,
    p_date: formatDate(targetDate),
    p_gross_yield: grossYieldAmount,  // Pass calculated gross yield amount
    p_purpose: purpose,
  });

  if (error) {
    console.error("Error previewing yield distribution:", error);
    throw new Error(`Failed to preview yield: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || "Preview failed");
  }

  // Transform backend response to frontend format
  // Backend returns 'investors' array, not 'distributions'
  const distributions: YieldDistribution[] = (data.investors || []).map((d: any) => ({
    investorId: d.investor_id,
    investorName: d.investor_name,
    accountType: d.account_type,
    currentBalance: Number(d.current_value || 0),  // Backend uses current_value
    allocationPercentage: Number(d.allocation_pct || 0),  // Backend uses allocation_pct
    feePercentage: Number(d.fee_pct || 0),  // Backend uses fee_pct
    grossYield: Number(d.gross_yield || 0),
    feeAmount: Number(d.fee_amount || 0),
    netYield: Number(d.net_yield || 0),
    newBalance: Number(d.new_balance || 0),
    positionDelta: Number(d.position_delta || 0),
    ibParentId: d.ib_parent_id,
    ibParentName: d.ib_parent_name,
    ibPercentage: Number(d.ib_percentage || 0),
    ibAmount: Number(d.ib_amount || 0),
    ibSource: d.ib_source,
    referenceId: d.reference_id,
    wouldSkip: d.would_skip || false,
  }));

  const ibCredits: IBCredit[] = (data.ib_credits || []).map((c: any) => ({
    ibInvestorId: c.ib_investor_id,
    ibInvestorName: c.ib_investor_name,
    sourceInvestorId: c.source_investor_id,
    sourceInvestorName: c.source_investor_name,
    amount: Number(c.amount || 0),
    ibPercentage: Number(c.ib_percentage || 0),
    source: c.source,
    referenceId: c.reference_id,
    wouldSkip: c.would_skip || false,
  }));

  // Backend returns flat total fields with fallback to nested totals object
  // INDIGO FEES Credit = Total Fees - IB Fees (what remains after IB takes their share)
  const totalFees = Number(data.total_fees || data.totals?.fees || 0);
  const totalIb = Number(data.total_ib || data.total_ib_fees || data.totals?.ib_fees || 0);
  const indigoCredit = Number(data.indigo_fees_credit || data.indigo_revenue || (totalFees - totalIb));
  
  const totals: YieldTotals = {
    gross: Number(data.total_gross || data.totals?.gross || grossYieldAmount),
    fees: totalFees,
    ibFees: totalIb,
    net: Number(data.total_net || data.totals?.net || 0),
    indigoCredit: indigoCredit,
  };

  const yieldPercentage = currentAUM > 0 ? (grossYieldAmount / currentAUM) * 100 : 0;

  return {
    success: true,
    preview: true,
    fundId,
    fundCode: data.fund_code || "",
    fundAsset: data.fund_asset || "",
    yieldDate: targetDate,
    effectiveDate: data.effective_date,
    purpose: data.purpose,
    isMonthEnd: data.is_month_end,
    currentAUM: Number(data.current_aum || currentAUM),
    newAUM: Number(data.new_aum || newTotalAUM),
    grossYield: grossYieldAmount,
    netYield: totals.net,
    totalFees: totals.fees,
    totalIbFees: totals.ibFees,
    yieldPercentage,
    investorCount: distributions.length,
    distributions,
    ibCredits,
    indigoFeesCredit: indigoCredit,
    indigoFeesId: data.indigo_fees_id,
    existingConflicts: data.existing_conflicts || [],
    hasConflicts: data.has_conflicts || false,
    totals,
    status: "preview",
    snapshotInfo,
  };
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
      console.warn("Could not create snapshot:", snapshotResult.error);
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
  // Purpose is passed to control whether this yield appears in investor reports
  // Updated to match new 5-param signature: (p_fund_id, p_date, p_gross_amount, p_admin_id, p_purpose)
  const { data, error } = await (supabase.rpc as any)("apply_daily_yield_to_fund_v2", {
    p_fund_id: fundId,
    p_date: formatDate(targetDate),
    p_gross_amount: grossYieldAmount,
    p_admin_id: adminId,
    p_purpose: purpose, // Uses correct column mappings now
  });

  if (error) {
    console.error("Error applying yield distribution:", error);
    throw new Error(`Failed to apply yield: ${error.message}`);
  }

  // Lock the snapshot after successful yield application
  if (periodId && snapshotInfo) {
    const lockResult = await lockPeriodSnapshot(fundId, periodId, adminId);
    if (lockResult.success) {
      snapshotInfo.isLocked = true;
    }
  }

  // Parse response - apply returns JSONB now
  const result = data as any;
  
  const distributions: YieldDistribution[] = [];
  const totals: YieldTotals = {
    gross: grossYieldAmount,
    fees: Number(result?.total_fees || 0),
    ibFees: Number(result?.total_ib_fees || 0),
    net: grossYieldAmount - Number(result?.total_fees || 0) - Number(result?.total_ib_fees || 0),
    indigoCredit: Number(result?.total_fees || 0),
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
    grossYield: grossYieldAmount,
    netYield: totals.net,
    totalFees: totals.fees,
    totalIbFees: totals.ibFees,
    yieldPercentage: currentAUM > 0 ? (grossYieldAmount / currentAUM) * 100 : 0,
    investorCount: Number(result?.investors_updated || 0),
    distributions,
    ibCredits: [],
    indigoFeesCredit: totals.indigoCredit,
    existingConflicts: [],
    hasConflicts: false,
    totals,
    status: "applied",
    snapshotInfo,
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
    throw new Error(`Failed to fetch latest AUM: ${error.message}`);
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
        purpose: "transaction", // Default purpose for draft entries
        source: notes || "manual",
        created_by: adminId || null,
      },
      {
        onConflict: "fund_id,aum_date,purpose",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error saving draft AUM entry:", error);
    // Check for RLS/permission errors
    if (error.code === '42501' || error.message?.includes('policy')) {
      throw new Error("Permission denied: Admin access required to record AUM.");
    }
    throw new Error(`Failed to save AUM: ${error.message}`);
  }

  return data as FundDailyAUM;
}

/**
 * Get active funds with their current positions
 */
export async function getActiveFundsWithPositions(): Promise<
  Array<{
    id: string;
    code: string;
    name: string;
    asset: string;
    totalAUM: number;
    investorCount: number;
  }>
> {
  const { data: funds, error } = await supabase
    .from("funds")
    .select("id, code, name, asset")
    .eq("status", "active")
    .order("code");

  if (error) {
    throw new Error(`Failed to fetch funds: ${error.message}`);
  }

  const fundsWithAUM = await Promise.all(
    (funds || []).map(async (fund) => {
      const { data: positions } = await supabase
        .from("investor_positions")
        .select("current_value, investor_id")
        .eq("fund_id", fund.id)
        .gt("current_value", 0);

      const totalAUM = positions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;
      const uniqueInvestors = new Set(positions?.map((p) => p.investor_id) || []);

      return {
        ...fund,
        totalAUM,
        investorCount: uniqueInvestors.size,
      };
    })
  );

  return fundsWithAUM.sort((a, b) => b.totalAUM - a.totalAUM);
}
