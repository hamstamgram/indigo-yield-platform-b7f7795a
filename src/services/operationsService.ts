import { supabase } from "@/integrations/supabase/client";

export interface OperationsMetrics {
  pendingApprovals: number;
  todaysTransactions: number;
  activeInvestors: number;
  totalAUM: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  pendingInvestments: number;
}

export interface PendingBreakdown {
  deposits: number;
  withdrawals: number;
  investments: number;
}

export const operationsService = {
  /**
   * Get comprehensive operations metrics
   */
  async getMetrics(): Promise<OperationsMetrics> {
    try {
      // Fetch all metrics in parallel
      const results = await Promise.all([
        // Pending withdrawals
        supabase
          .from("withdrawal_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "approved"]),

        // Pending deposits (from transactions_v2)
        supabase
          .from("transactions_v2")
          .select("id", { count: "exact", head: true })
          .eq("type", "DEPOSIT")
          .eq("status", "pending"),

        // Pending investments
        supabase
          .from("investments")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),

        // Today's transactions
        supabase
          .from("transactions_v2")
          .select("id", { count: "exact", head: true })
          .gte("txn_date", new Date().toISOString().split("T")[0]),

        // Active investors
        supabase
          .from("investors")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),

        // Total AUM from investor positions
        supabase.from("investor_positions").select("current_value").gt("current_value", 0),
      ]);

      const withdrawalsResult = results[0] as any;
      const depositsResult = results[1] as any;
      const investmentsResult = results[2] as any;
      const transactionsResult = results[3] as any;
      const investorsResult = results[4] as any;
      const aumResult = results[5] as any;

      // Calculate total AUM
      const totalAUM =
        aumResult.data?.reduce(
          (sum: number, position: any) => sum + (position.current_value || 0),
          0
        ) || 0;

      const pendingWithdrawals = withdrawalsResult.count || 0;
      const pendingDeposits = depositsResult.count || 0;
      const pendingInvestments = investmentsResult.count || 0;

      return {
        pendingApprovals: pendingWithdrawals + pendingDeposits + pendingInvestments,
        todaysTransactions: transactionsResult.count || 0,
        activeInvestors: investorsResult.count || 0,
        totalAUM,
        pendingWithdrawals,
        pendingDeposits,
        pendingInvestments,
      };
    } catch (error) {
      console.error("Error fetching operations metrics:", error);
      throw error;
    }
  },

  /**
   * Get yesterday's transaction count for comparison
   */
  async getYesterdayTransactions(): Promise<number> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split("T")[0];

      const today = new Date().toISOString().split("T")[0];

      const { count, error } = await supabase
        .from("transactions_v2")
        .select("id", { count: "exact", head: true })
        .gte("txn_date", yesterdayDate)
        .lt("txn_date", today);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error fetching yesterday transactions:", error);
      return 0;
    }
  },

  /**
   * Get pending items breakdown
   */
  getPendingBreakdown(metrics: OperationsMetrics): PendingBreakdown {
    return {
      deposits: metrics.pendingDeposits,
      withdrawals: metrics.pendingWithdrawals,
      investments: metrics.pendingInvestments,
    };
  },

  /**
   * Calculate trend percentage
   */
  calculateTrend(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  },
};
