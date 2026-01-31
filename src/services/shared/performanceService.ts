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
        mtd_beginning_balance: String(r.mtd_beginning_balance ?? 0),
        mtd_additions: String(r.mtd_additions ?? 0),
        mtd_redemptions: String(r.mtd_redemptions ?? 0),
        mtd_net_income: String(r.mtd_net_income ?? 0),
        mtd_ending_balance: String(r.mtd_ending_balance ?? 0),
        mtd_rate_of_return: String(r.mtd_rate_of_return ?? 0),
        qtd_beginning_balance: String(r.qtd_beginning_balance ?? 0),
        qtd_additions: String(r.qtd_additions ?? 0),
        qtd_redemptions: String(r.qtd_redemptions ?? 0),
        qtd_net_income: String(r.qtd_net_income ?? 0),
        qtd_ending_balance: String(r.qtd_ending_balance ?? 0),
        qtd_rate_of_return: String(r.qtd_rate_of_return ?? 0),
        ytd_beginning_balance: String(r.ytd_beginning_balance ?? 0),
        ytd_additions: String(r.ytd_additions ?? 0),
        ytd_redemptions: String(r.ytd_redemptions ?? 0),
        ytd_net_income: String(r.ytd_net_income ?? 0),
        ytd_ending_balance: String(r.ytd_ending_balance ?? 0),
        ytd_rate_of_return: String(r.ytd_rate_of_return ?? 0),
        itd_beginning_balance:
          r.itd_beginning_balance != null ? String(r.itd_beginning_balance) : undefined,
        itd_additions: r.itd_additions != null ? String(r.itd_additions) : undefined,
        itd_redemptions: r.itd_redemptions != null ? String(r.itd_redemptions) : undefined,
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
          beginningBalance: Number(rec.mtd_beginning_balance || 0),
          additions: Number(rec.mtd_additions || 0),
          redemptions: Number(rec.mtd_redemptions || 0),
          netIncome: Number(rec.mtd_net_income || 0),
          endingBalance: Number(rec.mtd_ending_balance || 0),
          rateOfReturn: Number(rec.mtd_rate_of_return || 0),
        },
        qtd: {
          beginningBalance: Number(rec.qtd_beginning_balance || 0),
          additions: Number(rec.qtd_additions || 0),
          redemptions: Number(rec.qtd_redemptions || 0),
          netIncome: Number(rec.qtd_net_income || 0),
          endingBalance: Number(rec.qtd_ending_balance || 0),
          rateOfReturn: Number(rec.qtd_rate_of_return || 0),
        },
        ytd: {
          beginningBalance: Number(rec.ytd_beginning_balance || 0),
          additions: Number(rec.ytd_additions || 0),
          redemptions: Number(rec.ytd_redemptions || 0),
          netIncome: Number(rec.ytd_net_income || 0),
          endingBalance: Number(rec.ytd_ending_balance || 0),
          rateOfReturn: Number(rec.ytd_rate_of_return || 0),
        },
        itd: {
          beginningBalance: Number(rec.itd_beginning_balance || 0),
          additions: Number(rec.itd_additions || 0),
          redemptions: Number(rec.itd_redemptions || 0),
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

      // Also fetch yield events to calculate actual returns
      const { data: yieldEvents } = await supabase
        .from("investor_yield_events")
        .select("fund_id, net_yield_amount, event_date, visibility_scope, is_voided")
        .eq("investor_id", userId)
        .eq("is_voided", false)
        .eq("visibility_scope", "investor_visible");

      // Aggregate yields by fund
      const yieldByFund = new Map<string, { mtd: number; qtd: number; ytd: number; itd: number }>();
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentQuarter = Math.floor(currentMonth / 3);

      yieldEvents?.forEach((event) => {
        const fundId = event.fund_id;
        const amount = Number(event.net_yield_amount || 0);
        const eventDate = new Date(event.event_date);
        const eventYear = eventDate.getFullYear();
        const eventMonth = eventDate.getMonth();
        const eventQuarter = Math.floor(eventMonth / 3);

        if (!yieldByFund.has(fundId)) {
          yieldByFund.set(fundId, { mtd: 0, qtd: 0, ytd: 0, itd: 0 });
        }

        const fundYields = yieldByFund.get(fundId)!;

        // ITD: All yields
        fundYields.itd += amount;

        // YTD: Same year
        if (eventYear === currentYear) {
          fundYields.ytd += amount;

          // QTD: Same quarter and year
          if (eventQuarter === currentQuarter) {
            fundYields.qtd += amount;

            // MTD: Same month and year
            if (eventMonth === currentMonth) {
              fundYields.mtd += amount;
            }
          }
        }
      });

      if (!positionsError && positions && positions.length > 0) {
        perAssetStats = positions.map((pos) => {
          const fundName = fundIdToName.get(pos.fund_id) || "Unknown Fund";
          const assetSymbol = fundIdToAsset.get(pos.fund_id) || "UNKNOWN";
          const balance = Number(pos.current_value || 0);
          const yields = yieldByFund.get(pos.fund_id) || { mtd: 0, qtd: 0, ytd: 0, itd: 0 };

          // Calculate rate of return: (netIncome / balance) * 100
          // Use beginning balance approximation (balance - yields) for more accurate RoR
          const calcRoR = (netIncome: number, endBal: number) => {
            const beginBal = endBal - netIncome;
            if (beginBal <= 0) return netIncome > 0 ? 100 : 0;
            return (netIncome / beginBal) * 100;
          };

          return {
            fundName,
            assetSymbol,
            periodName: "Current",
            mtd: {
              beginningBalance: balance - yields.mtd,
              additions: 0,
              redemptions: 0,
              netIncome: yields.mtd,
              endingBalance: balance,
              rateOfReturn: calcRoR(yields.mtd, balance),
            },
            qtd: {
              beginningBalance: balance - yields.qtd,
              additions: 0,
              redemptions: 0,
              netIncome: yields.qtd,
              endingBalance: balance,
              rateOfReturn: calcRoR(yields.qtd, balance),
            },
            ytd: {
              beginningBalance: balance - yields.ytd,
              additions: 0,
              redemptions: 0,
              netIncome: yields.ytd,
              endingBalance: balance,
              rateOfReturn: calcRoR(yields.ytd, balance),
            },
            itd: {
              beginningBalance: 0,
              additions: balance - yields.itd,
              redemptions: 0,
              netIncome: yields.itd,
              endingBalance: balance,
              rateOfReturn: calcRoR(yields.itd, balance),
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
