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

        // Pending deposits - transactions_v2 doesn't have status column, deposits are immediately confirmed
        // Return 0 as all deposits in transactions_v2 are already completed
        Promise.resolve({ count: 0 } as any),

        // Pending investments - Note: "INVESTMENT" type doesn't exist, investments are tracked via DEPOSIT
        // Return 0 for now as there's no separate investment tracking
        Promise.resolve({ count: 0 } as any),

        // Today's transactions
        supabase
          .from("transactions_v2")
          .select("id", { count: "exact", head: true })
          .gte("tx_date", new Date().toISOString().split("T")[0])
          .eq("is_voided", false),

        // Active investors
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("is_admin", false),

        // Total AUM from investor positions (investors only, not fees/IB)
        supabase
          .from("investor_positions")
          .select("current_value, investor_id")
          .gt("current_value", 0),
        
        // Get investor account profiles
        supabase
          .from("profiles")
          .select("id")
          .eq("account_type", "investor"),
      ]);

      const withdrawalsResult = results[0] as any;
      const depositsResult = results[1] as any;
      const investmentsResult = results[2] as any;
      const transactionsResult = results[3] as any;
      const investorsResult = results[4] as any;
      const aumResult = results[5] as any;
      const investorProfilesResult = results[6] as any;

      // Calculate total AUM (only for investor account types)
      const investorIds = new Set(
        (investorProfilesResult.data || []).map((p: any) => p.id)
      );
      const totalAUM =
        aumResult.data
          ?.filter((position: any) => investorIds.has(position.investor_id))
          .reduce(
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
        .gte("tx_date", yesterdayDate)
        .lt("tx_date", today)
        .eq("is_voided", false);

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
