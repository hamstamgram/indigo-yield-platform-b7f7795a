/**
 * Yield Distribution Service
 * Handles daily yield entry, preview, and distribution across investor positions
 * All values are in NATIVE TOKENS (BTC, ETH, USDT, etc.) - never fiat
 * 
 * IMPORTANT: Preview now uses backend RPC for exact parity with apply
 * 
 * Yield Crystallization Integration:
 * - Deposits/withdrawals automatically crystallize yield before processing
 * - Month-end yield application calls finalize_month_yield to make events visible to investors
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  ensureSnapshotExists, 
  lockPeriodSnapshot, 
  isPeriodLocked,
  getFundPeriodSnapshot
} from "@/services/operations/snapshotService";
import { yieldNotifications } from "@/services/notifications";
import { finalizeMonthYield } from "@/services/admin/yieldCrystallizationService";

// Re-export types from canonical source for backwards compatibility
export type {
  YieldCalculationInput,
  YieldDistribution,
  IBCredit,
  YieldTotals,
  YieldCalculationResult,
  FundDailyAUM,
  YieldSnapshotInfo,
  YieldPurpose,
  YieldStatus,
} from "@/types/domains/yield";

// Import types for internal use
import type {
  YieldCalculationInput,
  YieldDistribution,
  IBCredit,
  YieldTotals,
  YieldCalculationResult,
  FundDailyAUM,
} from "@/types/domains/yield";

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

  // CRITICAL: Always use CURRENT positions for AUM calculation
  // The backend RPC also uses current positions for distribution percentages
  // This ensures consistency between preview and apply operations
  // Historical AUM lookup was causing discrepancies because:
  // 1. Frontend calculated gross yield from historical AUM
  // 2. Backend distributed based on current positions
  // This led to incorrect yield amounts when positions changed since the historical date
  
  const { data: positions, error: posError } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fundId)
    .gt("current_value", 0);

  if (posError) {
    throw new Error(`Failed to fetch positions: ${posError.message}`);
  }

  const currentAUM = positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;
  
  // Warn for backdated entries
  const today = new Date();
  const isBackdated = targetDate < today;
  if (isBackdated) {
    console.info(`Recording backdated yield for ${formatDate(targetDate)}. Using current positions AUM (${currentAUM}) for consistency with backend distribution.`);
  }
  
  const grossYieldAmount = Math.max(newTotalAUM - currentAUM, 0);

  if (grossYieldAmount <= 0) {
    throw new Error(`New AUM (${newTotalAUM}) must be greater than ${isBackdated ? 'historical' : 'current'} AUM (${currentAUM}) to distribute yield`);
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

  // Call backend preview RPC with v3 signature (matches apply_daily_yield_to_fund_v3)
  // DB function: preview_daily_yield_to_fund_v3(p_fund_id uuid, p_yield_date date, p_new_aum numeric, p_purpose aum_purpose)
  const { data, error } = await (supabase.rpc as any)("preview_daily_yield_to_fund_v3", {
    p_fund_id: fundId,
    p_yield_date: formatDate(targetDate),
    p_new_aum: newTotalAUM,  // v3 uses p_new_aum like apply
    p_purpose: purpose,
  });

  if (error) {
    console.error("Error previewing yield distribution:", error);
    throw new Error(`Failed to preview yield: ${error.message}`);
  }

  // Backend returns complete JSONB object - use it directly
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

  // Return mapped result
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

  // Use v3 apply function which supports ownership-weighted yield distribution
  // and properly sets aum_record_id for cascade voiding
  const { data, error } = await (supabase.rpc as any)("apply_daily_yield_to_fund_v3", {
    p_fund_id: fundId,
    p_yield_date: formatDate(targetDate),
    p_new_aum: newTotalAUM,
    p_actor_id: adminId,
    p_purpose: purpose,
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

  // Finalize yield visibility - make all admin_only yield events visible to investors
  // This is called at month-end when yield is distributed
  try {
    const finalizationResult = await finalizeMonthYield(
      fundId,
      targetDate.getFullYear(),
      targetDate.getMonth() + 1, // JavaScript months are 0-indexed
      adminId
    );
    
    // Yield finalization succeeded - events_made_visible count available if needed for debugging
  } catch (finalizationError) {
    // Log but don't fail - the yield was applied successfully
    console.warn("Yield finalization failed (non-fatal):", finalizationError);
  }

  // Parse response - apply returns JSONB now
  const result = data as any;

  // Send yield notifications to affected investors (non-blocking)
  // Fetch fund info for notifications
  const { data: fundInfo } = await supabase
    .from("funds")
    .select("name, asset")
    .eq("id", fundId)
    .single();

  // Fetch affected investors for notifications (excluding system accounts)
  const { data: affectedInvestors } = await supabase
    .from("transactions_v2")
    .select("investor_id, amount")
    .eq("fund_id", fundId)
    .eq("tx_date", formatDate(targetDate))
    .in("type", ["INTEREST", "YIELD"])
    .eq("is_voided", false);

  if (affectedInvestors?.length && fundInfo) {
    const distributions = affectedInvestors.map(inv => ({
      userId: inv.investor_id,
      distributionId: `yield:${fundId}:${formatDate(targetDate)}:${inv.investor_id}`,
      fundId,
      fundName: fundInfo.name,
      amount: Number(inv.amount),
      asset: fundInfo.asset,
      yieldDate: formatDate(targetDate),
      yieldPercentage: currentAUM > 0 ? (grossYieldAmount / currentAUM) * 100 : undefined,
    }));

    yieldNotifications.onFundYieldDistributed(distributions)
      .catch(err => console.error("Failed to send yield notifications:", err));
  }
  
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
    .eq("is_voided", false)
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
    .eq("is_voided", false)
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
  const dateStr = formatDate(recordDate);
  const purpose = "transaction";

  // Check for existing active record (partial index workaround)
  const { data: existing } = await supabase
    .from("fund_daily_aum")
    .select("id")
    .eq("fund_id", fundId)
    .eq("aum_date", dateStr)
    .eq("purpose", purpose)
    .eq("is_voided", false)
    .maybeSingle();

  if (existing) {
    // UPDATE existing record
    const { data, error } = await supabase
      .from("fund_daily_aum")
      .update({
        total_aum: closingAUM,
        as_of_date: dateStr,
        source: notes || "manual",
        updated_by: adminId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating AUM entry:", error);
      if (error.code === '42501' || error.message?.includes('policy')) {
        throw new Error("Permission denied: Admin access required to record AUM.");
      }
      throw new Error(`Failed to update AUM: ${error.message}`);
    }
    return data as FundDailyAUM;
  } else {
    // INSERT new record
    const { data, error } = await supabase
      .from("fund_daily_aum")
      .insert({
        fund_id: fundId,
        aum_date: dateStr,
        as_of_date: dateStr,
        total_aum: closingAUM,
        purpose: purpose,
        source: notes || "manual",
        created_by: adminId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting AUM entry:", error);
      if (error.code === '42501' || error.message?.includes('policy')) {
        throw new Error("Permission denied: Admin access required to record AUM.");
      }
      throw new Error(`Failed to save AUM: ${error.message}`);
    }
    return data as FundDailyAUM;
  }
}


/**
 * Get active funds with AUM and record counts
 */
export async function getActiveFundsWithAUM(): Promise<
  Array<{
    id: string;
    code: string;
    name: string;
    asset: string;
    total_aum: number;
    investor_count: number;
    aum_record_count: number;
  }>
> {
  const { data: fundsData, error } = await supabase
    .from("funds")
    .select("id, code, name, asset")
    .eq("status", "active")
    .order("code");

  if (error) throw new Error(`Failed to fetch funds: ${error.message}`);

  const fundsWithAUM = await Promise.all(
    (fundsData || []).map(async (fund) => {
      const { data: positions } = await supabase
        .from("investor_positions")
        .select("current_value, investor_id")
        .eq("fund_id", fund.id);

      const { count: aumCount } = await supabase
        .from("fund_daily_aum")
        .select("*", { count: "exact", head: true })
        .eq("fund_id", fund.id);

      const total_aum = positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;
      const uniqueInvestors = new Set(positions?.map((p) => p.investor_id) || []);

      return {
        ...fund,
        total_aum,
        investor_count: uniqueInvestors.size,
        aum_record_count: aumCount || 0,
      };
    })
  );

  return fundsWithAUM.sort((a, b) => b.total_aum - a.total_aum);
}

/**
 * Get investor composition for a fund with MTD yield
 */
export async function getFundInvestorComposition(fundId: string): Promise<
  Array<{
    investor_id: string;
    investor_name: string;
    investor_email: string;
    current_value: number;
    ownership_pct: number;
    mtd_yield: number;
  }>
> {
  // Get all positions for this fund
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select("investor_id, current_value")
    .eq("fund_id", fundId);

  if (error) throw new Error(`Failed to fetch positions: ${error.message}`);

  const totalAUM = positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;
  const investorIds = [...new Set(positions?.map((p) => p.investor_id).filter(Boolean))];

  // Get investor profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", investorIds.length > 0 ? investorIds : ["00000000-0000-0000-0000-000000000000"]);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  // Calculate MTD period
  const now = new Date();
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const mtdEnd = now.toISOString().split("T")[0];

  // Fetch MTD yield transactions
  const { data: yieldTransactions } = await supabase
    .from("transactions_v2")
    .select("investor_id, type, amount")
    .eq("fund_id", fundId)
    .in("investor_id", investorIds.length > 0 ? investorIds : ["00000000-0000-0000-0000-000000000000"])
    .in("type", ["INTEREST", "FEE"])
    .gte("tx_date", mtdStart)
    .lte("tx_date", mtdEnd)
    .eq("is_voided", false);

  // Calculate MTD yield per investor
  const mtdYieldMap = new Map<string, number>();
  (yieldTransactions || []).forEach((tx) => {
    const currentYield = mtdYieldMap.get(tx.investor_id!) || 0;
    if (tx.type === "INTEREST") {
      mtdYieldMap.set(tx.investor_id!, currentYield + Number(tx.amount || 0));
    } else if (tx.type === "FEE") {
      mtdYieldMap.set(tx.investor_id!, currentYield - Math.abs(Number(tx.amount || 0)));
    }
  });

  // Build investor positions list
  return (positions || [])
    .filter((p) => p.investor_id)
    .map((p) => {
      const profile = profileMap.get(p.investor_id);
      const name = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
        : "Unknown";

      return {
        investor_id: p.investor_id!,
        investor_name: name,
        investor_email: profile?.email || "",
        current_value: p.current_value || 0,
        ownership_pct: totalAUM > 0 ? ((p.current_value || 0) / totalAUM) * 100 : 0,
        mtd_yield: mtdYieldMap.get(p.investor_id!) || 0,
      };
    });
}

/**
 * Get statement period ID for a given year and month
 */
export async function getStatementPeriodId(year: number, month: number): Promise<string | null> {
  const { data, error } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (error) {
    console.error("Error looking up period:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get investor positions with fund details
 */
export async function getInvestorPositionsWithFunds(investorId: string): Promise<
  Array<{
    fund_id: string;
    fund_name: string;
    asset: string;
    current_value: number;
    shares: number;
  }>
> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select(`
      fund_id,
      shares,
      current_value,
      funds!fk_investor_positions_fund(name, asset, status)
    `)
    .eq("investor_id", investorId);

  if (error) throw new Error(`Failed to fetch positions: ${error.message}`);

  return (data || [])
    .filter((p: any) => p.funds?.status === "active")
    .map((p: any) => ({
      fund_id: p.fund_id,
      fund_name: p.funds?.name || "Unknown",
      asset: p.funds?.asset || "USD",
      current_value: p.current_value || 0,
      shares: p.shares || 0,
    }));
}

/**
 * Get investor performance records for a specific period (yield management focused)
 */
export async function getInvestorPerformanceForPeriod(investorId: string, periodId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select("*")
    .eq("investor_id", investorId)
    .eq("period_id", periodId);

  if (error) throw new Error(`Failed to fetch performance: ${error.message}`);
  return data || [];
}

/**
 * Get investor fee schedule
 */
export async function getInvestorFeeSchedule(investorId: string): Promise<
  Array<{
    id: string;
    fund_id: string | null;
    fee_pct: number;
    effective_date: string;
  }>
> {
  const { data, error } = await supabase
    .from("investor_fee_schedule")
    .select("id, fund_id, fee_pct, effective_date")
    .eq("investor_id", investorId)
    .order("effective_date", { ascending: false });

  if (error) throw new Error(`Failed to fetch fee schedule: ${error.message}`);
  return data || [];
}

/**
 * Get investor monthly reports (from investor_fund_performance)
 */
export async function getInvestorMonthlyReports(investorId: string): Promise<any[]> {
  const { data, error } = await (supabase as any)
    .from("investor_fund_performance")
    .select(`
      *,
      period:statement_periods (
        period_end_date
      )
    `)
    .eq("investor_id", investorId)
    .order("period(period_end_date)", { ascending: false })
    .order("fund_name", { ascending: true });

  if (error) throw new Error(`Failed to fetch monthly reports: ${error.message}`);
  return data || [];
}

/**
 * Create monthly report template for an investor
 */
export async function createMonthlyReportTemplate(
  investorId: string,
  year: number,
  month: number,
  assetCode: string = "USDT"
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  // Check if period exists
  let periodId: string;
  const { data: period } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (period) {
    periodId = period.id;
  } else {
    // Create period if it doesn't exist
    const date = new Date(year, month - 1);
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];
    const { data: newPeriod, error: createError } = await supabase
      .from("statement_periods")
      .insert({
        year,
        month,
        period_name: date.toLocaleString("default", { month: "long", year: "numeric" }),
        period_end_date: endDate,
        created_by: user?.id,
        status: "FINALIZED",
      })
      .select("id")
      .single();

    if (createError) throw new Error(`Failed to create period: ${createError.message}`);
    periodId = newPeriod.id;
  }

  // Insert performance record
  const { error } = await (supabase as any).from("investor_fund_performance").insert({
    investor_id: investorId,
    period_id: periodId,
    fund_name: assetCode,
    mtd_beginning_balance: 0,
    mtd_ending_balance: 0,
    mtd_additions: 0,
    mtd_redemptions: 0,
    mtd_net_income: 0,
  });

  if (error) throw new Error(`Failed to create template: ${error.message}`);
}

/**
 * Update a monthly report field
 */
export async function updateMonthlyReportField(
  reportId: string,
  field: string,
  value: number
): Promise<void> {
  // Map legacy fields to V2 fields
  const fieldMap: Record<string, string> = {
    opening_balance: "mtd_beginning_balance",
    closing_balance: "mtd_ending_balance",
    additions: "mtd_additions",
    withdrawals: "mtd_redemptions",
    yield_earned: "mtd_net_income",
  };

  const v2Field = fieldMap[field] || field;

  const { error } = await supabase
    .from("investor_fund_performance")
    .update({ [v2Field]: value })
    .eq("id", reportId);

  if (error) throw new Error(`Failed to update report: ${error.message}`);
}
