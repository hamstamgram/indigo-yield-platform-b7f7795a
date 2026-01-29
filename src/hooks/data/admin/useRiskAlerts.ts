import { useQuery } from "@tanstack/react-query";
import { REFETCH_INTERVAL, QUERY_DEFAULTS } from "@/constants/queryConfig";
import { 
  queryView, 
  type VLiquidityRisk, 
  type VConcentrationRisk 
} from "@/lib/db/viewTypes";

// Re-export types for consumers
export type { VLiquidityRisk as LiquidityRisk, VConcentrationRisk as ConcentrationRisk };

// Fetch liquidity risk view
export function useLiquidityRisk() {
  return useQuery({
    queryKey: ["liquidity-risk"],
    queryFn: async () => {
      const { data, error } = await queryView("v_liquidity_risk").select("*");
      if (error) throw error;
      return (data || []) as VLiquidityRisk[];
    },
    ...QUERY_DEFAULTS.riskMonitoring,
    refetchInterval: REFETCH_INTERVAL.LOW,
  });
}

// Fetch concentration risk view
export function useConcentrationRisk() {
  return useQuery({
    queryKey: ["concentration-risk"],
    queryFn: async () => {
      const { data, error } = await queryView("v_concentration_risk")
        .select("*")
        .in("concentration_level", ["MEDIUM", "HIGH", "CRITICAL"])
        .order("ownership_pct", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as VConcentrationRisk[];
    },
    ...QUERY_DEFAULTS.riskMonitoring,
    refetchInterval: REFETCH_INTERVAL.LOW,
  });
}

// Note: PlatformMetrics and FundSummary types moved to useLivePlatformMetrics.ts
// Deprecated hooks (usePlatformMetrics, useFundSummaries, useRefreshMaterializedViews)
// were removed in the real-time architecture upgrade (2026-01-19).
// Use useLivePlatformMetrics and useLiveFundSummary from '@/hooks/data/shared/useLivePlatformMetrics' instead.
