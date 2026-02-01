import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { getTodayString, formatDateForDB } from "@/utils/dateUtils";

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

/** Typed count result for Supabase queries */
interface CountQueryResult {
  count: number | null;
  error: { message: string } | null;
}

/** Position row from investor_positions */
interface PositionRow {
  current_value: number;
  investor_id: string;
}

/** Profile ID row for investor filtering */
interface ProfileIdRow {
  id: string;
}

/** Typed tuple for parallel query results */
type MetricsQueryResults = [
  { count: number | null; error: unknown }, // withdrawals
  CountQueryResult, // deposits (mock)
  CountQueryResult, // investments (mock)
  { count: number | null; error: unknown }, // transactions
  { count: number | null; error: unknown }, // investors
  { data: PositionRow[] | null; error: unknown }, // AUM positions
  { data: ProfileIdRow[] | null; error: unknown }, // investor profiles
];

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
        // Return typed result with 0 count
        Promise.resolve({ count: 0, error: null } as CountQueryResult),

        // Pending investments - Note: "INVESTMENT" type doesn't exist, investments are tracked via DEPOSIT
        // Return typed result with 0 count
        Promise.resolve({ count: 0, error: null } as CountQueryResult),

        // Today's transactions
        supabase
          .from("transactions_v2")
          .select("id", { count: "exact", head: true })
          .gte("tx_date", getTodayString())
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
        supabase.from("profiles").select("id").eq("account_type", "investor"),
      ]);

      const [
        withdrawalsResult,
        depositsResult,
        investmentsResult,
        transactionsResult,
        investorsResult,
        aumResult,
        investorProfilesResult,
      ] = results as MetricsQueryResults;

      // Calculate total AUM (only for investor account types)
      const investorIds = new Set((investorProfilesResult.data || []).map((p) => p.id));
      const totalAUM =
        aumResult.data
          ?.filter((position) => investorIds.has(position.investor_id))
          .reduce((sum, position) => sum + (position.current_value || 0), 0) || 0;

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
      logError("operationsService.getMetrics", error);
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
      const yesterdayDate = formatDateForDB(yesterday);

      const today = getTodayString();

      const { count, error } = await supabase
        .from("transactions_v2")
        .select("id", { count: "exact", head: true })
        .gte("tx_date", yesterdayDate)
        .lt("tx_date", today)
        .eq("is_voided", false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      logError("operationsService.getYesterdayTransactions", error);
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
