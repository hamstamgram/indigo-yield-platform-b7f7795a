/**
 * Yield Distribution Service
 * Handles daily yield entry, preview, and distribution across investor positions
 * All values are in NATIVE TOKENS (BTC, ETH, USDT, etc.) - never fiat
 * 
 * IMPORTANT: v3 RPCs compute gross_yield server-side for exact parity
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  ensureSnapshotExists, 
  lockPeriodSnapshot, 
  isPeriodLocked,
  getFundPeriodSnapshot
} from "@/services/operations/snapshotService";
import { previewYieldV3, applyYieldV3 } from "@/lib/supabase/typedRpc";

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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

// ============================================================================
// Service Functions
// ============================================================================

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
 * Preview yield distribution using v3 RPC - server computes gross yield
 */
export async function previewYieldDistribution(
  input: YieldCalculationInput
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM, purpose = "reporting" } = input;

  // Validate fundId
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

  // Call v3 RPC - SERVER computes gross_yield = new_total_aum - current_aum
  const { data, error } = await previewYieldV3({
    p_fund_id: fundId,
    p_as_of_date: formatDate(targetDate),
    p_new_total_aum: newTotalAUM,
    p_purpose: purpose,
  });

  if (error) {
    console.error("Error previewing yield distribution:", error);
    throw new Error(`Failed to preview yield: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || "Preview failed");
  }

  // Transform backend response to frontend format
  const distributions: YieldDistribution[] = (data.investors || []).map((d) => ({
    investorId: d.investor_id,
    investorName: d.investor_name,
    accountType: d.account_type,
    currentBalance: Number(d.current_value || 0),
    allocationPercentage: Number(d.allocation_pct || 0),
    feePercentage: Number(d.fee_pct || 0),
    grossYield: Number(d.gross_yield || 0),
    feeAmount: Number(d.fee_amount || 0),
    netYield: Number(d.net_yield || 0),
    newBalance: Number(d.new_balance || 0),
    positionDelta: Number(d.position_delta || 0),
    ibParentId: d.ib_parent_id,
    ibParentName: d.ib_parent_name,
    ibPercentage: Number(d.ib_percentage || 0),
    ibAmount: Number(d.ib_amount || 0),
    ibSource: d.ib_source as 'from_platform_fees' | 'from_investor_yield' | undefined,
    referenceId: d.reference_id,
    wouldSkip: d.would_skip || false,
  }));

  const ibCredits: IBCredit[] = (data.ib_credits || []).map((c) => ({
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

  const totalFees = Number(data.total_fees || 0);
  const totalIb = Number(data.total_ib || 0);
  const indigoCredit = Number(data.indigo_fees_credit || (totalFees - totalIb));
  const currentAUM = Number(data.current_aum || 0);
  const grossYieldAmount = Number(data.gross_yield || 0);
  
  const totals: YieldTotals = {
    gross: Number(data.total_gross || grossYieldAmount),
    fees: totalFees,
    ibFees: totalIb,
    net: Number(data.total_net || 0),
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
    currentAUM,
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
 * Apply yield distribution using v3 RPC - server computes gross yield
 * This permanently updates investor positions and creates transactions.
 */
export async function applyYieldDistribution(
  input: YieldCalculationInput,
  adminId: string,
  purpose: "reporting" | "transaction" = "reporting"
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM } = input;

  // Validate fundId
  if (!fundId || !isValidUUID(fundId)) {
    throw new Error(`Invalid fund ID format: "${fundId}". Expected a valid UUID.`);
  }

  // Get or create period snapshot before applying yield
  const periodId = await getPeriodIdForDate(targetDate);
  let snapshotInfo: YieldCalculationResult["snapshotInfo"];
  
  if (periodId) {
    const isLocked = await isPeriodLocked(fundId, periodId);
    if (isLocked) {
      throw new Error("This period is locked. Yield has already been applied for this period.");
    }
    
    const snapshotResult = await ensureSnapshotExists(fundId, periodId, adminId);
    if (snapshotResult.exists && snapshotResult.snapshotId) {
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

  // Call v3 RPC - SERVER computes gross_yield and commits atomically
  const { data, error } = await applyYieldV3({
    p_fund_id: fundId,
    p_as_of_date: formatDate(targetDate),
    p_new_total_aum: newTotalAUM,
    p_purpose: purpose,
  });

  if (error) {
    console.error("Error applying yield distribution:", error);
    throw new Error(`Failed to apply yield: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || "Apply failed");
  }

  // Lock the snapshot after successful yield application
  if (periodId && snapshotInfo) {
    const lockResult = await lockPeriodSnapshot(fundId, periodId, adminId);
    if (lockResult.success) {
      snapshotInfo.isLocked = true;
    }
  }

  const currentAUM = Number(data.current_aum || 0);
  const grossYieldAmount = Number(data.gross_yield || 0);
  const totalFees = Number(data.total_fees || 0);
  const totalIb = Number(data.total_ib || 0);
  
  const totals: YieldTotals = {
    gross: grossYieldAmount,
    fees: totalFees,
    ibFees: totalIb,
    net: Number(data.total_net || 0),
    indigoCredit: totalFees - totalIb,
  };

  return {
    success: true,
    fundId,
    fundCode: data.fund_code || "",
    fundAsset: data.fund_asset || "",
    yieldDate: targetDate,
    purpose,
    currentAUM,
    newAUM: newTotalAUM,
    grossYield: grossYieldAmount,
    netYield: totals.net,
    totalFees: totals.fees,
    totalIbFees: totals.ibFees,
    yieldPercentage: currentAUM > 0 ? (grossYieldAmount / currentAUM) * 100 : 0,
    investorCount: Number(data.investor_count || 0),
    distributions: [],
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

      const total_aum = positions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;
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

  const totalAUM = positions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;
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
      mtdYieldMap.set(tx.investor_id!, currentYield + (tx.amount || 0));
    } else if (tx.type === "FEE") {
      mtdYieldMap.set(tx.investor_id!, currentYield - Math.abs(tx.amount || 0));
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
      asset: p.funds?.asset || "USDT",
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
