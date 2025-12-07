import { supabase } from "@/integrations/supabase/client";
import { PerformanceRecord, PerformanceFilters } from "@/types/performance";

export const performanceService = {
  /**
   * Fetch performance history for an investor
   */
  async getInvestorPerformance(filters: PerformanceFilters): Promise<PerformanceRecord[]> {
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
      .eq("user_id", filters.userId);

    if (filters.assetCode && filters.assetCode !== "all") {
      query = query.eq("fund_name", filters.assetCode);
    }

    // Order by date descending (newest first)
    // We need to order by the joined table, which Supabase supports if defined correctly,
    // otherwise we might need to sort client side. 
    // Let's try client-side sorting to be safe if the relationship sort is tricky.
    
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching performance:", error);
      throw error;
    }

    // Sort by period_end_date descending
    const sortedData = (data as any[]).sort((a, b) => {
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
