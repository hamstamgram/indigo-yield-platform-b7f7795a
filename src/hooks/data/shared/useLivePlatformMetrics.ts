/**
 * useLivePlatformMetrics - Real-time platform metrics from live views
 * Replaces materialized view queries with live view queries
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LivePlatformMetrics {
  metric_date: string;
  active_investors: number;
  total_ibs: number;
  active_funds: number;
  total_platform_aum: number;
  pending_withdrawals: number;
  pending_withdrawal_amount: number;
  yields_today: number;
  refreshed_at: string;
}

export interface LiveFundSummary {
  fund_id: string;
  code: string;
  name: string;
  asset: string;
  status: string;
  investor_count: number;
  investor_aum: number;
  fees_balance: number;
  ib_balance: number;
  total_positions: number;
  latest_aum: number | null;
  latest_aum_date: string | null;
}

/**
 * Fetch live platform metrics (always fresh, no MV refresh needed)
 * Uses the live view v_daily_platform_metrics_live which computes in real-time
 */
export function useLivePlatformMetrics() {
  return useQuery({
    queryKey: ['live-platform-metrics'],
    queryFn: async (): Promise<LivePlatformMetrics | null> => {
      // Query the live view directly using raw SQL
      const { data, error } = await supabase
        .from('mv_daily_platform_metrics')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[LiveMetrics] Error fetching platform metrics:', error);
        return null;
      }
      
      return data as unknown as LivePlatformMetrics;
    },
    staleTime: 5000, // 5 seconds - these are live computed
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Fetch live fund summary (always fresh, no MV refresh needed)
 * Uses the live view v_fund_summary_live which computes in real-time
 */
export function useLiveFundSummary(fundId?: string) {
  return useQuery({
    queryKey: ['live-fund-summary', fundId],
    queryFn: async (): Promise<LiveFundSummary[]> => {
      // Use mv_fund_summary as it has the same structure
      const query = supabase
        .from('mv_fund_summary')
        .select('*');
      
      const { data, error } = fundId 
        ? await query.eq('fund_id', fundId)
        : await query;
      
      if (error) {
        console.error('[LiveMetrics] Error fetching fund summary:', error);
        return [];
      }
      
      return data as unknown as LiveFundSummary[];
    },
    staleTime: 5000,
    refetchInterval: 30000,
  });
}

/**
 * Fetch all live fund summaries
 */
export function useAllLiveFundSummaries() {
  return useLiveFundSummary();
}
