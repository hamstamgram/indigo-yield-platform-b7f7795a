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
   * Get per-asset stats for an investor (latest period data per fund)
   * Returns individual fund stats - NO aggregation across different assets
   */
  async getPerAssetStats(userId: string) {
    const records = await this.getInvestorPerformance({ userId });
    
    // Get latest record for each unique fund
    const latestByFund = new Map<string, PerformanceRecord>();
    
    records.forEach(rec => {
      if (!latestByFund.has(rec.fund_name)) {
        latestByFund.set(rec.fund_name, rec);
      }
    });

    // Return per-asset data (no aggregation)
    const perAssetStats = Array.from(latestByFund.values()).map(rec => ({
      fundName: rec.fund_name,
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
  }
};
