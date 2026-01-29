/**
 * useLivePlatformMetrics - Real-time platform metrics from live views
 * Replaces materialized view queries with live view queries
 */

import { useQuery } from "@tanstack/react-query";
import { 
  queryView,
  type VDailyPlatformMetricsLive,
  type VFundSummaryLive
} from "@/lib/db/viewTypes";

// Re-export types with legacy names for backwards compatibility
export type LivePlatformMetrics = VDailyPlatformMetricsLive;
export type LiveFundSummary = VFundSummaryLive;

/**
 * Fetch live platform metrics (always fresh, no MV refresh needed)
 * Uses the live view v_daily_platform_metrics_live which computes in real-time
 */
export function useLivePlatformMetrics() {
  return useQuery({
    queryKey: ['live-platform-metrics'],
    queryFn: async (): Promise<VDailyPlatformMetricsLive | null> => {
      // Query the live view (computes in real-time, no refresh needed)
      const { data, error } = await queryView("v_daily_platform_metrics_live")
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[LiveMetrics] Error fetching platform metrics:', error);
        return null;
      }
      
      return data as VDailyPlatformMetricsLive | null;
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
    queryFn: async (): Promise<VFundSummaryLive[]> => {
      // Use live view (computes in real-time, no refresh needed)
      const query = queryView("v_fund_summary_live").select('*');
      
      const { data, error } = fundId 
        ? await query.eq('fund_id', fundId)
        : await query;
      
      if (error) {
        console.error('[LiveMetrics] Error fetching fund summary:', error);
        return [];
      }
      
      return (data || []) as VFundSummaryLive[];
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
