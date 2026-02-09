/**
 * Investor Overview Queries
 *
 * React Query hooks for investor overview page data
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { STALE_TIME } from "@/constants/queryConfig";
import type { StatementPeriodRelation } from "@/types/domains/relations";

/**
 * Fetch recent transactions for the current investor
 */
export function useRecentInvestorTransactions(limit = 5) {
  return useQuery({
    queryKey: QUERY_KEYS.recentTransactions,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      // Convert amount to string for domain type precision
      return (data || []).map((tx) => ({
        ...tx,
        amount: String(tx.amount ?? "0"),
      }));
    },
    staleTime: STALE_TIME.FINANCIAL,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch pending withdrawals count for the current investor
 */
export function usePendingWithdrawalsCount() {
  return useQuery({
    queryKey: QUERY_KEYS.pendingWithdrawalsCount,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("withdrawal_requests")
        .select("*", { count: "exact", head: true })
        .eq("investor_id", user.id)
        .in("status", ["pending", "processing"]);

      if (error) throw error;
      return count || 0;
    },
    staleTime: STALE_TIME.FINANCIAL,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch the last statement period name for the current investor
 */
export function useLastStatementPeriod() {
  return useQuery({
    queryKey: QUERY_KEYS.lastStatementPeriod,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("investor_fund_performance")
        .select("period:statement_periods(period_name)")
        .eq("investor_id", user.id)
        .eq("purpose", "reporting")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return (
        ((data as { period?: unknown })?.period as StatementPeriodRelation | undefined)
          ?.period_name || null
      );
    },
    staleTime: STALE_TIME.REFERENCE,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch latest statement summary for the current investor
 * Returns per-fund ending balances from the most recent statement period
 */
export interface LatestStatementSummary {
  periodName: string;
  funds: Array<{
    fund_name: string;
    asset_code: string;
    ending_balance: number;
    net_income: number;
  }>;
}

function getAssetFromFundName(fundName: string): string {
  const match = fundName.match(/^(\w+)\s/);
  return match ? match[1] : fundName;
}

export function useLatestStatementSummary() {
  return useQuery<LatestStatementSummary | null>({
    queryKey: ["latest-statement-summary"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Get the latest period with performance data
      const { data: records, error } = await supabase
        .from("investor_fund_performance")
        .select(
          "fund_name, mtd_ending_balance, mtd_net_income, period:statement_periods(period_name, year, month)"
        )
        .eq("investor_id", user.id)
        .eq("purpose", "reporting")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error || !records || records.length === 0) return null;

      // Group by period - take the latest one
      const firstRecord = records[0] as {
        period?: { period_name?: string; year?: number; month?: number };
      };
      const periodName = firstRecord?.period?.period_name || null;
      if (!periodName) return null;

      // Filter records matching the latest period
      const latestRecords = records.filter((r) => {
        const p = r as { period?: { period_name?: string } };
        return p?.period?.period_name === periodName;
      });

      return {
        periodName,
        funds: latestRecords.map((r) => ({
          fund_name: r.fund_name || "",
          asset_code: getAssetFromFundName(r.fund_name || ""),
          ending_balance: Number(r.mtd_ending_balance) || 0,
          net_income: Number(r.mtd_net_income) || 0,
        })),
      };
    },
    staleTime: STALE_TIME.REFERENCE,
  });
}

export type RecentTransaction = {
  id: string;
  type: string;
  amount: string;
  asset: string;
  tx_date: string;
};
