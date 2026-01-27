/**
 * Performance Service
 *
 * @module performanceService
 * @description
 * Provides read access to investor performance data from the `investor_fund_performance`
 * table. This service supports the investor dashboard, performance history, and
 * admin reporting features.
 *
 * ## Rate of Return Storage
 * The database stores pre-calculated RoR values for each time horizon:
 * - `mtd_rate_of_return` - Month-to-date
 * - `qtd_rate_of_return` - Quarter-to-date
 * - `ytd_rate_of_return` - Year-to-date
 * - `itd_rate_of_return` - Inception-to-date
 *
 * ## Calculation Methodology: Modified Dietz Method
 * Rate of Return is calculated using the Modified Dietz approximation:
 *
 * ```
 * RoR = (Net Income / (Beginning Balance + (Additions - Redemptions) / 2)) × 100
 * ```
 *
 * This formula:
 * - Approximates time-weighted returns without requiring daily valuations
 * - Assumes cash flows occur at the midpoint of the period
 * - Is the industry standard for monthly investor statements
 * - Provides more accurate results than simple RoR when cash flows are significant
 *
 * ## Balance Equation Invariant
 * For data integrity, the following equation must always hold:
 *
 * ```
 * ending_balance = beginning_balance + additions - redemptions + net_income
 * ```
 *
 * This invariant is validated by the E2E test suite.
 *
 * @see https://en.wikipedia.org/wiki/Modified_Dietz_method
 * @see docs/FINANCIAL_RULEBOOK.md for canonical formulas
 * @see tests/sql/performance_balance_e2e.sql for balance equation validation
 */
import { supabase } from "@/integrations/supabase/client";
import { PerformanceRecord, PerformanceFilters } from "@/types/domains";
import { logError } from "@/lib/logger";
import type { PerformanceWithPeriod } from "@/types/domains/yield";

export const performanceService = {
  /**
   * Fetch performance history for an investor
   */
  async getInvestorPerformance(filters: PerformanceFilters): Promise<PerformanceRecord[]> {
    // V2 Architecture: investor_id = profiles.id (One ID)
    let query = supabase
      .from("investor_fund_performance")
      .select(
        `
        *,
        period:statement_periods (
          period_name,
          period_end_date,
          year,
          month
        )
      `
      )
      .eq("investor_id", filters.userId);

    if (filters.assetCode && filters.assetCode !== "all") {
      query = query.eq("fund_name", filters.assetCode);
    }

    const { data, error } = await query;

    if (error) {
      logError("performanceService.getInvestorPerformance", error, { userId: filters.userId });
      throw error;
    }

    // Cast to typed interface to break deep type instantiation chain from Supabase inference
    const rawData = data as unknown as PerformanceWithPeriod[];

    // Sort by period_end_date descending
    const sortedData = rawData.sort((a, b) => {
      const dateA = new Date(a.period?.period_end_date || 0).getTime();
      const dateB = new Date(b.period?.period_end_date || 0).getTime();
      return dateB - dateA;
    });

    // Map to PerformanceRecord (convert nullable numbers to strings)
    return sortedData.map(
      (r): PerformanceRecord => ({
        id: r.id,
        period_id: r.period_id,
        investor_id: r.investor_id,
        fund_name: r.fund_name,
        mtd_net_income: String(r.mtd_net_income ?? 0),
        mtd_ending_balance: String(r.mtd_ending_balance ?? 0),
        mtd_rate_of_return: String(r.mtd_rate_of_return ?? 0),
        qtd_net_income: String(r.qtd_net_income ?? 0),
        qtd_ending_balance: String(r.qtd_ending_balance ?? 0),
        qtd_rate_of_return: String(r.qtd_rate_of_return ?? 0),
        ytd_net_income: String(r.ytd_net_income ?? 0),
        ytd_ending_balance: String(r.ytd_ending_balance ?? 0),
        ytd_rate_of_return: String(r.ytd_rate_of_return ?? 0),
        itd_net_income: r.itd_net_income != null ? String(r.itd_net_income) : undefined,
        itd_ending_balance: r.itd_ending_balance != null ? String(r.itd_ending_balance) : undefined,
        itd_rate_of_return: r.itd_rate_of_return != null ? String(r.itd_rate_of_return) : undefined,
        period: r.period
          ? {
              period_name: r.period.period_name || "",
              period_end_date: r.period.period_end_date || "",
              year: r.period.year || 0,
              month: r.period.month || 0,
            }
          : undefined,
      })
    );
  },

  /**
   * Get per-asset stats for an investor (latest period data per fund)
   * Returns individual fund stats - NO aggregation across different assets
   * Falls back to investor_positions for new investors without performance history
   */
  async getPerAssetStats(userId: string) {
    const records = await this.getInvestorPerformance({ userId });

    // Fetch funds to get asset symbols and names
    const { data: funds } = await supabase.from("funds").select("id, name, asset, code");

    // Create maps for fund lookups
    const fundToAsset = new Map<string, string>();
    const fundIdToName = new Map<string, string>();
    const fundIdToAsset = new Map<string, string>();
    funds?.forEach((f) => {
      fundToAsset.set(f.name, f.asset);
      fundIdToName.set(f.id, f.name);
      fundIdToAsset.set(f.id, f.asset);
    });

    // Get latest record for each unique fund
    const latestByFund = new Map<string, PerformanceRecord>();

    records.forEach((rec) => {
      if (!latestByFund.has(rec.fund_name)) {
        latestByFund.set(rec.fund_name, rec);
      }
    });

    // Return per-asset data (no aggregation)
    // Filter out zero-value positions (ending balance <= 0 means position is inactive)
    let perAssetStats = Array.from(latestByFund.values())
      .filter((rec) => Number(rec.mtd_ending_balance || 0) > 0)
      .map((rec) => ({
        fundName: rec.fund_name,
        assetSymbol: fundToAsset.get(rec.fund_name) || rec.fund_name,
        periodName: rec.period?.period_name || "Current",
        mtd: {
          netIncome: Number(rec.mtd_net_income || 0),
          endingBalance: Number(rec.mtd_ending_balance || 0),
          rateOfReturn: Number(rec.mtd_rate_of_return || 0),
        },
        qtd: {
          netIncome: Number(rec.qtd_net_income || 0),
          endingBalance: Number(rec.qtd_ending_balance || 0),
          rateOfReturn: Number(rec.qtd_rate_of_return || 0),
        },
        ytd: {
          netIncome: Number(rec.ytd_net_income || 0),
          endingBalance: Number(rec.ytd_ending_balance || 0),
          rateOfReturn: Number(rec.ytd_rate_of_return || 0),
        },
        itd: {
          netIncome: Number(rec.itd_net_income || 0),
          endingBalance: Number(rec.itd_ending_balance || 0),
          rateOfReturn: Number(rec.itd_rate_of_return || 0),
        },
      }));

    // Fallback: If no performance records, check investor_positions directly
    // This handles new investors who have deposits but no yield distributions yet
    if (perAssetStats.length === 0) {
      const { data: positions, error: positionsError } = await supabase
        .from("investor_positions")
        .select("fund_id, current_value, shares, is_active")
        .eq("investor_id", userId)
        .eq("is_active", true)
        .gt("current_value", 0);

      if (!positionsError && positions && positions.length > 0) {
        perAssetStats = positions.map((pos) => {
          const fundName = fundIdToName.get(pos.fund_id) || "Unknown Fund";
          const assetSymbol = fundIdToAsset.get(pos.fund_id) || "UNKNOWN";
          const balance = Number(pos.current_value || 0);

          return {
            fundName,
            assetSymbol,
            periodName: "Current",
            mtd: {
              netIncome: 0,
              endingBalance: balance,
              rateOfReturn: 0,
            },
            qtd: {
              netIncome: 0,
              endingBalance: balance,
              rateOfReturn: 0,
            },
            ytd: {
              netIncome: 0,
              endingBalance: balance,
              rateOfReturn: 0,
            },
            itd: {
              netIncome: 0,
              endingBalance: balance,
              rateOfReturn: 0,
            },
          };
        });
      }
    }

    return {
      assets: perAssetStats,
      activeFunds: perAssetStats.length || latestByFund.size,
    };
  },

  /**
   * Get finalized (month-end reporting purpose) AUM data for investor display
   * Only returns data that has been finalized for reporting
   */
  async getFinalizedInvestorData(userId: string): Promise<{
    totalBalance: number;
    ytdReturn: number;
    activeFunds: number;
    lastFinalizedDate: string | null;
    isCurrentMonth: boolean;
  }> {
    // Get latest finalized statement period
    const { data: latestPeriod, error: periodError } = await supabase
      .from("statement_periods")
      .select("id, period_name, period_end_date")
      .eq("status", "FINALIZED")
      .order("period_end_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (periodError) {
      logError("performanceService.getFinalizedInvestorData", periodError, { userId });
    }

    // If no finalized period, check for any period with data
    let periodToUse = latestPeriod;
    if (!periodToUse) {
      const { data: anyPeriod } = await supabase
        .from("statement_periods")
        .select("id, period_name, period_end_date")
        .order("period_end_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      periodToUse = anyPeriod;
    }

    // Get investor's performance data for the latest period
    const { data: performance } = await supabase
      .from("investor_fund_performance")
      .select("fund_name, mtd_ending_balance, ytd_rate_of_return")
      .eq("investor_id", userId)
      .eq("period_id", periodToUse?.id || "");

    // Calculate totals
    const totalBalance =
      performance?.reduce((sum, p) => sum + Number(p.mtd_ending_balance || 0), 0) || 0;

    // Get weighted average YTD return
    const ytdReturn = performance?.length
      ? performance.reduce((sum, p) => sum + Number(p.ytd_rate_of_return || 0), 0) /
        performance.length
      : 0;

    const activeFunds =
      performance?.filter((p) => Number(p.mtd_ending_balance || 0) > 0).length || 0;

    // Check if finalized period is current month
    const now = new Date();
    const periodDate = periodToUse?.period_end_date ? new Date(periodToUse.period_end_date) : null;
    const isCurrentMonth = periodDate
      ? periodDate.getMonth() === now.getMonth() && periodDate.getFullYear() === now.getFullYear()
      : false;

    return {
      totalBalance,
      ytdReturn: ytdReturn / 100, // Convert to decimal for formatting
      activeFunds,
      lastFinalizedDate: periodToUse?.period_end_date || null,
      isCurrentMonth,
    };
  },

  /**
   * Get performance history grouped by asset/fund
   * Returns data formatted for MyPerformanceHistory component
   */
  async getPerformanceHistoryGrouped(
    userId: string
  ): Promise<Record<string, PerformanceHistoryRecord[]>> {
    const { data, error } = await supabase
      .from("investor_fund_performance")
      .select(
        `
        *,
        period:statement_periods (
          period_end_date
        )
      `
      )
      .eq("investor_id", userId)
      .order("period(period_end_date)", { ascending: false });

    if (error) {
      logError("performanceService.getPerformanceHistoryGrouped", error, { userId });
      throw error;
    }

    // Map to MonthlyReport format using typed interface
    const typedData = (data || []) as unknown as PerformanceWithPeriod[];
    const reports = typedData.map((r) => ({
      id: r.id,
      report_month: r.period?.period_end_date || "",
      asset_code: r.fund_name,
      opening_balance: Number(r.mtd_beginning_balance || 0),
      closing_balance: Number(r.mtd_ending_balance || 0),
      additions: Number(r.mtd_additions || 0),
      withdrawals: Number(r.mtd_redemptions || 0),
      yield_earned: Number(r.mtd_net_income || 0),
    }));

    // Group by asset
    const grouped = reports.reduce(
      (acc: Record<string, PerformanceHistoryRecord[]>, report) => {
        const asset = report.asset_code;
        if (!acc[asset]) acc[asset] = [];
        acc[asset].push(report);
        return acc;
      },
      {} as Record<string, PerformanceHistoryRecord[]>
    );

    return grouped;
  },
};

// Type for performance history records
export interface PerformanceHistoryRecord {
  id: string;
  report_month: string;
  asset_code: string;
  opening_balance: number;
  closing_balance: number;
  additions: number;
  withdrawals: number;
  yield_earned: number;
}
