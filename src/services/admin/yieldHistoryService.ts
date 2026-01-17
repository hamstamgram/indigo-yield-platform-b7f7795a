/**
 * Yield History Service
 * Handles AUM history and fund yield data retrieval
 * Split from yieldDistributionService for better maintainability
 */

import { supabase } from "@/integrations/supabase/client";
import type { FundDailyAUM } from "@/types/domains/yield";

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

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
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

  const lastUpdated =
    positions?.reduce(
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
      console.error("Error updating AUM entry:", error);
      if (error.code === "42501" || error.message?.includes("policy")) {
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
      if (error.code === "42501" || error.message?.includes("policy")) {
        throw new Error("Permission denied: Admin access required to record AUM.");
      }
      throw new Error(`Failed to save AUM: ${error.message}`);
    }
    return data as FundDailyAUM;
  }
}

/**
 * Get active funds with AUM and record counts
 * Optimized: batch queries instead of N+1
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
  if (!fundsData || fundsData.length === 0) return [];

  const fundIds = fundsData.map((f) => f.id);

  // Batch fetch all positions for all funds in a single query
  const { data: allPositions } = await supabase
    .from("investor_positions")
    .select("fund_id, current_value, investor_id")
    .in("fund_id", fundIds);

  // Batch fetch all AUM record counts
  const { data: aumRecords } = await supabase
    .from("fund_daily_aum")
    .select("fund_id")
    .in("fund_id", fundIds);

  // Build lookup maps
  const positionsByFund = new Map<string, typeof allPositions>();
  (allPositions || []).forEach((p) => {
    const existing = positionsByFund.get(p.fund_id) || [];
    existing.push(p);
    positionsByFund.set(p.fund_id, existing);
  });

  const aumCountByFund = new Map<string, number>();
  (aumRecords || []).forEach((r) => {
    aumCountByFund.set(r.fund_id, (aumCountByFund.get(r.fund_id) || 0) + 1);
  });

  const fundsWithAUM = fundsData.map((fund) => {
    const positions = positionsByFund.get(fund.id) || [];
    const total_aum = positions.reduce((sum, p) => sum + Number(p.current_value || 0), 0);
    const uniqueInvestors = new Set(positions.map((p) => p.investor_id).filter(Boolean));

    return {
      ...fund,
      total_aum,
      investor_count: uniqueInvestors.size,
      aum_record_count: aumCountByFund.get(fund.id) || 0,
    };
  });

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
    .in(
      "investor_id",
      investorIds.length > 0 ? investorIds : ["00000000-0000-0000-0000-000000000000"]
    )
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
    .select(
      `
      fund_id,
      shares,
      current_value,
      funds!fk_investor_positions_fund(name, asset, status)
    `
    )
    .eq("investor_id", investorId);

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
