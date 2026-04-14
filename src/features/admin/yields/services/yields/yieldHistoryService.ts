/**
 * Yield History Service
 * Handles AUM history and fund yield data retrieval
 * Split from yieldDistributionService for better maintainability
 */

import { supabase } from "@/integrations/supabase/client";
import { callRPC, callRPCNoArgs } from "@/lib/supabase/typedRPC";
import type { FundDailyAUM, YieldPurpose } from "@/types/domains/yield";
import { formatDateForDB, getTodayString, getMonthStartDate } from "@/utils/dateUtils";
import { logError, logWarn } from "@/lib/logger";
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
 * Get historical AUM entries for a fund (DEPRECATED: Reads from dynamic RPC now)
 */
export async function getFundAUMHistory(
  fundId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FundDailyAUM[]> {
  // Since we removed the snapshot table, this now returns an empty array or
  // can be refactored to call a historical generation RPC if required by UI.
  // For now, the dashboard flows are strictly built on the single `get_funds_aum_snapshot` for "Today".
  return [];
}

/**
 * Get the latest AUM entry for a fund
 */
export async function getLatestFundAUM(fundId: string): Promise<FundDailyAUM | null> {
  return null;
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
    .limit(5000);

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
      .filter(
        (p) =>
          p.account_type === "investor" ||
          p.account_type === "ib" ||
          p.account_type === "fees_account"
      )
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
  // AUM tracking is now 100% implicitly defined by transactions.
  // There is no longer a concept of saving a "draft AUM entry" manually to a snapshot table.
  // We simply return a synthetic object to appease the interface without writing to deprecated tables.
  return {
    id: "synthetic-" + Date.now(),
    fund_id: fundId,
    aum_date: formatDateForDB(recordDate),
    as_of_date: formatDateForDB(recordDate),
    total_aum: closingAUM.toString(),
    purpose: "transaction",
    is_voided: false,
    created_at: new Date().toISOString(),
  } as unknown as FundDailyAUM;
}

/**
 * Get active funds with AUM and record counts
 * Optimized: batch queries instead of N+1
 * AUM includes all active position holders (investor + fees_account + ib).
 * Investor count remains investor-only for UI readability.
 */
/**
 * Get active funds with AUM and record counts
 * Uses server-side aggregation via get_active_funds_summary RPC
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
  const { data, error } = await callRPCNoArgs("get_active_funds_summary" as any);

  if (error) {
    logError("yieldHistoryService.getActiveFundsWithAUM", error);
    throw new Error(`Failed to fetch active funds summary: ${error.message}`);
  }

  return (data || []).map((f: any) => {
    // RIGOROUS MAPPING: Check both v5 (fund_id) and v6 (id) styles
    // The RPC returns {id, code, name, asset, total_aum, investor_count}
    const id = f.id || f.fund_id;
    const code = f.code || f.fund_code;
    const name = f.name || f.fund_name;
    const asset = f.asset || f.fund_asset;

    if (!id) {
      logWarn("yieldHistoryService.mapFunds", { fund: code || name || "unknown" });
    }

    return {
      id,
      code,
      name,
      asset,
      total_aum: parseFinancial(f.total_aum || 0).toNumber(),
      investor_count: Number(f.investor_count || 0),
      aum_record_count: Number(f.aum_record_count || 0),
    };
  });
}

/**
 * Get investor composition for a fund with MTD yield
 * Uses server-side aggregation via get_fund_composition RPC
 * Includes all account types (investor, IB, fees_account) with balance > 0.
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
  const { data, error } = await callRPC("get_fund_composition", {
    p_fund_id: fundId,
    p_date: new Date().toISOString().split("T")[0],
  });

  if (error) {
    logError("yieldHistoryService.getFundInvestorCompositionWithYield", error);
    throw new Error(`Failed to fetch fund composition: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    investor_id: row.investor_id,
    investor_name: row.investor_name,
    investor_email: row.investor_email,
    current_value: parseFinancial(row.current_value).toNumber(),
    ownership_pct: parseFinancial(row.ownership_pct).toNumber(),
    mtd_yield: parseFinancial(row.mtd_yield).toNumber(),
  }));
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
      funds!fk_investor_positions_fund_id(name, asset, status)
    `
    )
    .eq("investor_id", investorId)
    .limit(100);

  if (error) throw new Error(`Failed to fetch positions: ${error.message}`);

  return ((data || []) as unknown as PositionWithFundJoin[])
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
