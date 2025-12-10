import { supabase } from "@/integrations/supabase/client";
import { PerformanceRecord, PerformanceFilters } from "@/types/performance";

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
      console.error("Error fetching performance:", error);
      throw error;
    }

    // Cast to unknown first to break deep type instantiation chain from Supabase inference
    const rawData = data as unknown as any[];

    // Sort by period_end_date descending
    const sortedData = rawData.sort((a, b) => {
      const dateA = new Date(a.period?.period_end_date || 0).getTime();
      const dateB = new Date(b.period?.period_end_date || 0).getTime();
      return dateB - dateA;
    });

    return sortedData as PerformanceRecord[];
  },

  /**
   * Get aggregated performance stats (e.g., Total AUM, YTD Yield)
   */
  async getAggregatedStats(userId: string) {
    const records = await this.getInvestorPerformance({ userId });
    
    // Get latest record for each unique fund
    const latestByFund = new Map<string, PerformanceRecord>();
    
    records.forEach(rec => {
      if (!latestByFund.has(rec.fund_name)) {
        latestByFund.set(rec.fund_name, rec);
      }
    });

    let totalEndingBalance = 0;
    let totalYtdNetIncome = 0;

    latestByFund.forEach(rec => {
        totalEndingBalance += Number(rec.mtd_ending_balance || 0);
        totalYtdNetIncome += Number(rec.ytd_net_income || 0);
    });

    return {
      totalAum: totalEndingBalance,
      totalYtdYield: totalYtdNetIncome,
      activeFunds: latestByFund.size
    };
  }
};
