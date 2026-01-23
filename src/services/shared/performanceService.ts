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
      .select(`
        *,
        period:statement_periods (
          period_name,
          period_end_date,
          year,
          month
        )
      `)
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
    return sortedData.map((r): PerformanceRecord => ({
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
      period: r.period ? {
        period_name: r.period.period_name || "",
        period_end_date: r.period.period_end_date || "",
        year: r.period.year || 0,
        month: r.period.month || 0,
      } : undefined,
    }));
  },

  /**
   * Get per-asset stats for an investor (latest period data per fund)
   * Returns individual fund stats - NO aggregation across different assets
   */
  async getPerAssetStats(userId: string) {
    const records = await this.getInvestorPerformance({ userId });
    
    // Fetch funds to get asset symbols
    const { data: funds } = await supabase
      .from("funds")
      .select("name, asset");
    
    // Create a map of fund name -> asset symbol
    const fundToAsset = new Map<string, string>();
    funds?.forEach(f => {
      fundToAsset.set(f.name, f.asset);
    });
    
    // Get latest record for each unique fund
    const latestByFund = new Map<string, PerformanceRecord>();
    
    records.forEach(rec => {
      if (!latestByFund.has(rec.fund_name)) {
        latestByFund.set(rec.fund_name, rec);
      }
    });

    // Return per-asset data (no aggregation)
    // Filter out zero-value positions (ending balance <= 0 means position is inactive)
    const perAssetStats = Array.from(latestByFund.values())
      .filter(rec => Number(rec.mtd_ending_balance || 0) > 0)
      .map(rec => ({
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

    return {
      assets: perAssetStats,
      activeFunds: latestByFund.size
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
    const totalBalance = performance?.reduce(
      (sum, p) => sum + Number(p.mtd_ending_balance || 0), 
      0
    ) || 0;

    // Get weighted average YTD return
    const ytdReturn = performance?.length 
      ? performance.reduce((sum, p) => sum + Number(p.ytd_rate_of_return || 0), 0) / performance.length
      : 0;

    const activeFunds = performance?.filter(p => Number(p.mtd_ending_balance || 0) > 0).length || 0;

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
  async getPerformanceHistoryGrouped(userId: string): Promise<Record<string, PerformanceHistoryRecord[]>> {
    const { data, error } = await supabase
      .from("investor_fund_performance")
      .select(`
        *,
        period:statement_periods (
          period_end_date
        )
      `)
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
  }
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
