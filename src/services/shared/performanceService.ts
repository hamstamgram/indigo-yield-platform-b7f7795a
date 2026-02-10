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
import { getInvestorPositions } from "@/services/investor/investorPositionService";

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
   * Get per-asset stats for an investor from pre-computed investor_fund_performance.
   * Uses live positions for current balance, pre-computed data for period metrics.
   * Accepts optional periodId to select a specific statement period (defaults to latest).
   */
  async getPerAssetStats(userId: string, periodId?: string) {
    const livePositions = await getInvestorPositions(userId).catch(() => []);

    // Only active positions with balance > 0
    const activePositions = livePositions.filter((pos) => pos.currentValue > 0);

    if (activePositions.length === 0) {
      return { assets: [], activeFunds: 0, periodLabel: null, periodEndDate: null };
    }

    // Fetch pre-computed performance data from investor_fund_performance
    let perfQuery = supabase
      .from("investor_fund_performance")
      .select("*, period:statement_periods!inner(year, month, period_end_date)")
      .eq("investor_id", userId);

    if (periodId) {
      perfQuery = perfQuery.eq("period_id", periodId);
    } else {
      // Get latest period - order by period end date descending, take first batch
      perfQuery = perfQuery.order("created_at", { ascending: false });
    }

    const { data: perfRows } = await perfQuery;

    // Group by period to find the latest one if no periodId specified
    const rows = perfRows || [];
    if (rows.length === 0) {
      // No performance data - compute from transactions
      const computedAssets = [];
      for (const pos of activePositions) {
        const { data: txSums } = await supabase
          .from("transactions_v2")
          .select("type, amount")
          .eq("investor_id", userId)
          .eq("fund_id", pos.fundId)
          .eq("is_voided", false);

        let additions = 0;
        let redemptions = 0;
        let netIncome = 0;
        for (const tx of txSums || []) {
          const amt = Math.abs(Number(tx.amount));
          if (tx.type === "DEPOSIT") additions += amt;
          else if (tx.type === "WITHDRAWAL") redemptions += amt;
          else if (tx.type === "YIELD" || tx.type === "FEE_CREDIT" || tx.type === "IB_CREDIT") {
            netIncome += Number(tx.amount);
          }
        }

        const itdStats = {
          beginningBalance: 0,
          additions,
          redemptions,
          netIncome,
          endingBalance: pos.currentValue,
          rateOfReturn: additions > 0 && netIncome !== 0 ? (netIncome / additions) * 100 : 0,
        };

        computedAssets.push({
          fundName: pos.fundName,
          assetSymbol: pos.asset,
          periodName: "Current",
          mtd: itdStats,
          qtd: itdStats,
          ytd: itdStats,
          itd: itdStats,
        });
      }
      return {
        assets: computedAssets,
        activeFunds: activePositions.length,
        periodLabel: null,
        periodEndDate: null,
      };
    }

    // Find the latest period among results
    type PerfRow = (typeof rows)[number];
    const latestPeriodEnd = rows.reduce((latest: string, r: PerfRow) => {
      const d = (r as Record<string, unknown>).period as { period_end_date?: string } | null;
      const endDate = d?.period_end_date || "";
      return endDate > latest ? endDate : latest;
    }, "");

    // Filter to only the latest period's rows
    const latestRows = periodId
      ? rows
      : rows.filter((r: PerfRow) => {
          const d = (r as Record<string, unknown>).period as { period_end_date?: string } | null;
          return d?.period_end_date === latestPeriodEnd;
        });

    // Build period label
    const firstRow = latestRows[0] as PerfRow | undefined;
    const periodData = firstRow
      ? ((firstRow as Record<string, unknown>).period as {
          year?: number;
          month?: number;
          period_end_date?: string;
        } | null)
      : null;
    const periodLabel = periodData
      ? new Date(periodData.year || 2026, (periodData.month || 1) - 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : null;
    const periodEndDate = periodData?.period_end_date || null;

    // Map performance rows to per-asset stats, overriding ending balance with live positions
    const positionMap = new Map(activePositions.map((p) => [p.fundName, p]));

    const perAssetStats = latestRows
      .filter((r: PerfRow) => positionMap.has(r.fund_name))
      .map((r: PerfRow) => {
        const pos = positionMap.get(r.fund_name)!;
        const liveBalance = pos.currentValue;

        return {
          fundName: pos.fundName,
          assetSymbol: pos.asset,
          periodName: periodLabel || "Current",
          mtd: {
            beginningBalance: Number(r.mtd_beginning_balance || 0),
            additions: Number(r.mtd_additions || 0),
            redemptions: Number(r.mtd_redemptions || 0),
            netIncome: Number(r.mtd_net_income || 0),
            endingBalance: liveBalance,
            rateOfReturn: Number(r.mtd_rate_of_return || 0),
          },
          qtd: {
            beginningBalance: Number(r.qtd_beginning_balance || 0),
            additions: Number(r.qtd_additions || 0),
            redemptions: Number(r.qtd_redemptions || 0),
            netIncome: Number(r.qtd_net_income || 0),
            endingBalance: liveBalance,
            rateOfReturn: Number(r.qtd_rate_of_return || 0),
          },
          ytd: {
            beginningBalance: Number(r.ytd_beginning_balance || 0),
            additions: Number(r.ytd_additions || 0),
            redemptions: Number(r.ytd_redemptions || 0),
            netIncome: Number(r.ytd_net_income || 0),
            endingBalance: liveBalance,
            rateOfReturn: Number(r.ytd_rate_of_return || 0),
          },
          itd: {
            beginningBalance: Number(r.itd_beginning_balance || 0),
            additions: Number(r.itd_additions || 0),
            redemptions: Number(r.itd_redemptions || 0),
            netIncome: Number(r.itd_net_income || 0),
            endingBalance: liveBalance,
            rateOfReturn: Number(r.itd_rate_of_return || 0),
          },
        };
      });

    // Include positions that have no performance data yet - compute from transactions
    const missingPositions = activePositions.filter(
      (pos) => !perAssetStats.some((s) => s.fundName === pos.fundName)
    );

    if (missingPositions.length > 0) {
      // Batch fetch transaction sums for all missing positions
      for (const pos of missingPositions) {
        const { data: txSums } = await supabase
          .from("transactions_v2")
          .select("type, amount")
          .eq("investor_id", userId)
          .eq("fund_id", pos.fundId)
          .eq("is_voided", false);

        let additions = 0;
        let redemptions = 0;
        let netIncome = 0;
        for (const tx of txSums || []) {
          const amt = Math.abs(Number(tx.amount));
          if (tx.type === "DEPOSIT") additions += amt;
          else if (tx.type === "WITHDRAWAL") redemptions += amt;
          else if (tx.type === "YIELD" || tx.type === "FEE_CREDIT" || tx.type === "IB_CREDIT") {
            netIncome += Number(tx.amount);
          }
        }

        const itdStats = {
          beginningBalance: 0,
          additions,
          redemptions,
          netIncome,
          endingBalance: pos.currentValue,
          rateOfReturn: additions > 0 && netIncome !== 0 ? (netIncome / additions) * 100 : 0,
        };

        perAssetStats.push({
          fundName: pos.fundName,
          assetSymbol: pos.asset,
          periodName: periodLabel || "Current",
          mtd: itdStats,
          qtd: itdStats,
          ytd: itdStats,
          itd: itdStats,
        });
      }
    }

    return {
      assets: perAssetStats,
      activeFunds: perAssetStats.length,
      periodLabel,
      periodEndDate,
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
