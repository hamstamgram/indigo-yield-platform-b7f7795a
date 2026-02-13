/**
 * Yield History Service
 * Handles AUM history and fund yield data retrieval
 * Split from yieldDistributionService for better maintainability
 */

import { supabase } from "@/integrations/supabase/client";
import type { FundDailyAUM, YieldPurpose } from "@/types/domains/yield";
import { formatDateForDB, getTodayString, getMonthStartDate } from "@/utils/dateUtils";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";

/** Position with fund join result */
interface PositionWithFundJoin {
  fund_id: string;
  shares: number | null;
  current_value: number | null;
  funds: {
    name: string;
    asset: string;
    status: string;
  } | null;
}

// Use canonical formatDateForDB from dateUtils - see src/utils/dateUtils.ts for why
// toISOString().split("T")[0] is NOT timezone-safe

/**
 * Get historical AUM entries for a fund
 */
/**
 * Get historical AUM entries for a fund
 * Performance: Limited to 500 rows to prevent timeouts
 */
export async function getFundAUMHistory(
  fundId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FundDailyAUM[]> {
  let query = supabase
    .from("fund_daily_aum")
    .select(
      "id, fund_id, aum_date, as_of_date, total_aum, nav_per_share, total_shares, source, created_at, updated_at, is_voided, purpose"
    )
    .eq("fund_id", fundId)
    .eq("is_voided", false)
    .order("aum_date", { ascending: false })
    .limit(500); // P1 fix: Prevent timeout for large datasets

  if (startDate) {
    query = query.gte("aum_date", formatDateForDB(startDate));
  }
  if (endDate) {
    query = query.lte("aum_date", formatDateForDB(endDate));
  }

  const { data, error } = await query;

  if (error) {
    logError("yieldHistoryService.getFundAUMHistory", error);
    throw new Error(`Failed to fetch AUM history: ${error.message}`);
  }

  // Supabase returns numeric as number; cast to FundDailyAUM (string financial fields)
  return (data || []) as unknown as FundDailyAUM[];
}

/**
 * Get the latest AUM entry for a fund
 */
export async function getLatestFundAUM(fundId: string): Promise<FundDailyAUM | null> {
  const { data, error } = await supabase
    .from("fund_daily_aum")
    .select(
      "id, fund_id, aum_date, as_of_date, total_aum, nav_per_share, total_shares, source, created_at, updated_at, is_voided, purpose"
    )
    .eq("fund_id", fundId)
    .eq("is_voided", false)
    .order("aum_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logError("yieldHistoryService.getLatestFundAUM", error);
    throw new Error(`Failed to fetch latest AUM: ${error.message}`);
  }

  return data as unknown as FundDailyAUM | null;
}

/**
 * Get current fund AUM calculated from investor positions
 */
export async function getCurrentFundAUM(fundId: string): Promise<{
  totalAUM: number;
  investorCount: number;
  lastUpdated: string | null;
}> {
  // Fetch positions with balance filter
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select("investor_id, current_value, updated_at")
    .eq("fund_id", fundId)
    .gt("current_value", 0)
    .limit(500);

  if (error) {
    logError("yieldHistoryService.getCurrentFundAUM", error);
    throw new Error(`Failed to fetch current AUM: ${error.message}`);
  }

  // Fetch investor profiles to filter by account_type
  const investorIds = [...new Set((positions || []).map((p) => p.investor_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, account_type")
    .in("id", investorIds.length > 0 ? investorIds : ["none"]);

  const investorSet = new Set(
    (profiles || [])
      .filter((p) => p.account_type === "investor" || p.account_type === "ib")
      .map((p) => p.id)
  );

  // Filter to investor + IB accounts
  const investorPositions = (positions || []).filter((p) => investorSet.has(p.investor_id));

  const totalAUM = investorPositions
    .reduce((sum, p) => sum.plus(parseFinancial(p.current_value)), parseFinancial(0))
    .toNumber();

  const lastUpdated =
    investorPositions.reduce(
      (latest, p) => {
        if (!latest || (p.updated_at && p.updated_at > latest)) {
          return p.updated_at;
        }
        return latest;
      },
      null as string | null
    ) || null;

  return {
    totalAUM,
    investorCount: investorPositions.length,
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
  const dateStr = formatDateForDB(recordDate);
  const purpose = "transaction";

  // Check for existing active record
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
      logError("yieldHistoryService.saveDraftAUMEntry", error);
      if (error.code === "42501" || error.message?.includes("policy")) {
        throw new Error("Permission denied: Admin access required to record AUM.");
      }
      throw new Error(`Failed to update AUM: ${error.message}`);
    }
    return data as unknown as FundDailyAUM;
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
      logError("yieldHistoryService.saveDraftAUMEntry", error);
      if (error.code === "42501" || error.message?.includes("policy")) {
        throw new Error("Permission denied: Admin access required to record AUM.");
      }
      throw new Error(`Failed to save AUM: ${error.message}`);
    }
    return data as unknown as FundDailyAUM;
  }
}

/**
 * Get active funds with AUM and record counts
 * Optimized: batch queries instead of N+1
 * AUM includes all active position holders (investor + fees_account + ib).
 * Investor count remains investor-only for UI readability.
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
    .order("code")
    .limit(100);

  if (error) throw new Error(`Failed to fetch funds: ${error.message}`);
  if (!fundsData || fundsData.length === 0) return [];

  const fundIds = fundsData.map((f) => f.id);

  // Batch fetch all positions for all funds with current_value > 0
  const { data: allPositions } = await supabase
    .from("investor_positions")
    .select("fund_id, current_value, investor_id")
    .in("fund_id", fundIds)
    .gt("current_value", 0) // Exclude zero-balance positions
    .limit(500);

  // Fetch profiles to count investor-only participants.
  const investorIds = [...new Set((allPositions || []).map((p) => p.investor_id).filter(Boolean))];
  const { data: investorProfiles } = await supabase
    .from("profiles")
    .select("id")
    .in("id", investorIds.length > 0 ? investorIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("account_type", "investor")
    .limit(500);

  const investorSet = new Set(investorProfiles?.map((p) => p.id) || []);

  // Batch fetch all AUM record counts
  const { data: aumRecords } = await supabase
    .from("fund_daily_aum")
    .select("fund_id")
    .in("fund_id", fundIds)
    .limit(500);

  // Build lookup maps
  type FundPositionRow = { fund_id: string; current_value: number | null; investor_id: string };
  const positionsByFund = new Map<string, FundPositionRow[]>();
  const investorCountByFund = new Map<string, Set<string>>();

  (allPositions || []).forEach((p) => {
    const existing = positionsByFund.get(p.fund_id) || [];
    existing.push(p as FundPositionRow);
    positionsByFund.set(p.fund_id, existing);

    if (investorSet.has(p.investor_id)) {
      const investorIdsForFund = investorCountByFund.get(p.fund_id) || new Set<string>();
      investorIdsForFund.add(p.investor_id);
      investorCountByFund.set(p.fund_id, investorIdsForFund);
    }
  });

  const aumCountByFund = new Map<string, number>();
  (aumRecords || []).forEach((r) => {
    aumCountByFund.set(r.fund_id, (aumCountByFund.get(r.fund_id) || 0) + 1);
  });

  const fundsWithAUM = fundsData.map((fund) => {
    const positions = positionsByFund.get(fund.id) || [];
    const total_aum = positions
      .reduce((sum, p) => sum.plus(parseFinancial(p.current_value)), parseFinancial(0))
      .toNumber();
    const investorCount = investorCountByFund.get(fund.id)?.size || 0;

    return {
      ...fund,
      total_aum,
      investor_count: investorCount,
      aum_record_count: aumCountByFund.get(fund.id) || 0,
    };
  });

  return fundsWithAUM.sort((a, b) => b.total_aum - a.total_aum);
}

/**
 * Get investor composition for a fund with MTD yield
 * NOTE: Composition is investor-only by design (fees/IB omitted).
 */
export async function getFundInvestorCompositionWithYield(fundId: string): Promise<
  Array<{
    investor_id: string;
    investor_name: string;
    investor_email: string;
    current_value: number;
    ownership_pct: number;
    mtd_yield: number;
  }>
> {
  // Get positions for this fund with current_value > 0
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select("investor_id, current_value")
    .eq("fund_id", fundId)
    .gt("current_value", 0) // Exclude zero-balance positions
    .limit(500);

  if (error) throw new Error(`Failed to fetch positions: ${error.message}`);

  const investorIds = [...new Set(positions?.map((p) => p.investor_id).filter(Boolean))];

  // Get investor profiles with account_type
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, account_type")
    .in("id", investorIds.length > 0 ? investorIds : ["00000000-0000-0000-0000-000000000000"])
    .limit(500);

  // Filter to investor accounts only (exclude fee accounts, IB accounts)
  const investorProfiles = (profiles || []).filter((p) => p.account_type === "investor");
  const investorProfileIds = new Set(investorProfiles.map((p) => p.id));
  const profileMap = new Map(investorProfiles.map((p) => [p.id, p]));

  // Filter positions to only include investor accounts
  const investorPositions = (positions || []).filter((p) => investorProfileIds.has(p.investor_id));

  const totalAUM = investorPositions
    .reduce((sum, p) => sum.plus(parseFinancial(p.current_value)), parseFinancial(0))
    .toNumber();

  // Calculate MTD period
  const now = new Date();
  const mtdStart = getMonthStartDate(now.getFullYear(), now.getMonth() + 1);
  const mtdEnd = getTodayString();

  // Fetch MTD yield transactions for investor accounts only
  const investorIdList = [...investorProfileIds];
  const { data: yieldTransactions } = await supabase
    .from("transactions_v2")
    .select("investor_id, type, amount")
    .eq("fund_id", fundId)
    .in(
      "investor_id",
      investorIdList.length > 0 ? investorIdList : ["00000000-0000-0000-0000-000000000000"]
    )
    .in("type", ["YIELD", "FEE_CREDIT", "IB_CREDIT", "FEE"])
    .gte("tx_date", mtdStart)
    .lte("tx_date", mtdEnd)
    .eq("is_voided", false)
    .limit(500);

  // Calculate MTD yield per investor
  const mtdYieldMap = new Map<string, number>();
  (yieldTransactions || []).forEach((tx) => {
    const currentYield = mtdYieldMap.get(tx.investor_id!) || 0;
    if (tx.type === "YIELD" || tx.type === "FEE_CREDIT" || tx.type === "IB_CREDIT") {
      mtdYieldMap.set(
        tx.investor_id!,
        parseFinancial(currentYield).plus(parseFinancial(tx.amount)).toNumber()
      );
    } else if (tx.type === "FEE") {
      mtdYieldMap.set(
        tx.investor_id!,
        parseFinancial(currentYield).minus(parseFinancial(tx.amount).abs()).toNumber()
      );
    }
  });

  // Build investor positions list (only investor accounts)
  return investorPositions
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
    logError("yieldHistoryService.getStatementPeriodId", error);
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
    .select(
      `
      fund_id,
      shares,
      current_value,
      funds!fk_investor_positions_fund(name, asset, status)
    `
    )
    .eq("investor_id", investorId)
    .limit(100);

  if (error) throw new Error(`Failed to fetch positions: ${error.message}`);

  return ((data || []) as PositionWithFundJoin[])
    .filter((p) => p.funds?.status === "active")
    .map((p) => ({
      fund_id: p.fund_id,
      fund_name: p.funds?.name || "Unknown",
      asset: p.funds?.asset || "USD",
      current_value: p.current_value || 0,
      shares: p.shares || 0,
    }));
}
/**
 * Check if a distribution already exists for a fund, date, and purpose
 */
export async function checkExistingDistribution(
  fundId: string,
  effectiveDate: Date,
  purpose: YieldPurpose
) {
  const effectiveDateStr = formatDateForDB(effectiveDate);
  if (!effectiveDateStr) {
    return { exists: false, id: null, date: null };
  }

  const { data, error } = await supabase
    .from("yield_distributions")
    .select("id")
    .eq("fund_id", fundId)
    .eq("period_end", effectiveDateStr)
    .eq("is_voided", false)
    .eq("purpose", purpose)
    .limit(1);

  if (error) {
    logError("yieldHistoryService.checkExistingDistribution", error, { fundId, effectiveDateStr });
    return { exists: false, id: null, date: effectiveDateStr };
  }

  const existingId = data?.[0]?.id ?? null;
  return { exists: Boolean(existingId), id: existingId, date: effectiveDateStr };
}
