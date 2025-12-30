/**
 * Investor Overview Queries
 * 
 * React Query hooks for investor overview page data
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Fetch recent transactions for the current investor
 */
export function useRecentInvestorTransactions(limit = 5) {
  return useQuery({
    queryKey: QUERY_KEYS.recentTransactions,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("transactions_v2")
        .select("id, type, amount, asset, tx_date")
        .eq("investor_id", user.id)
        .eq("visibility_scope", "investor_visible")
        .eq("is_voided", false)
        .order("tx_date", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Fetch pending withdrawals count for the current investor
 */
export function usePendingWithdrawalsCount() {
  return useQuery({
    queryKey: QUERY_KEYS.pendingWithdrawalsCount,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("withdrawal_requests")
        .select("*", { count: "exact", head: true })
        .eq("investor_id", user.id)
        .in("status", ["pending", "processing"]);

      if (error) throw error;
      return count || 0;
    },
  });
}

/**
 * Fetch the last statement period name for the current investor
 */
export function useLastStatementPeriod() {
  return useQuery({
    queryKey: QUERY_KEYS.lastStatementPeriod,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("investor_fund_performance")
        .select("period:statement_periods(period_name)")
        .eq("investor_id", user.id)
        .eq("purpose", "reporting")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return (data?.period as any)?.period_name || null;
    },
  });
}

export type RecentTransaction = {
  id: string;
  type: string;
  amount: number;
  asset: string;
  tx_date: string;
};
