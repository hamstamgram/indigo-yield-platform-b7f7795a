import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REFETCH_INTERVAL, QUERY_DEFAULTS } from "@/constants/queryConfig";

export interface LiquidityRisk {
  fund_id: string;
  code: string;
  asset: string;
  current_aum: number;
  pending_amount: number;
  approved_amount: number;
  processing_amount: number;
  total_pending: number;
  withdrawal_pressure_pct: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
}

export interface ConcentrationRisk {
  fund_id: string;
  fund_code: string;
  investor_id: string;
  investor_name: string;
  account_type: string;
  position_value: number;
  fund_aum: number;
  ownership_pct: number;
  concentration_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// Fetch liquidity risk view
export function useLiquidityRisk() {
  return useQuery({
    queryKey: ["liquidity-risk"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("v_liquidity_risk").select("*");
      if (error) throw error;
      return data as LiquidityRisk[];
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
      const { data, error } = await (supabase as any)
        .from("v_concentration_risk")
        .select("*")
        .in("concentration_level", ["MEDIUM", "HIGH", "CRITICAL"])
        .order("ownership_pct", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ConcentrationRisk[];
    },
    ...QUERY_DEFAULTS.riskMonitoring,
    refetchInterval: REFETCH_INTERVAL.LOW,
  });
}

// Note: PlatformMetrics and FundSummary types moved to useLivePlatformMetrics.ts
// Deprecated hooks (usePlatformMetrics, useFundSummaries, useRefreshMaterializedViews)
// were removed in the real-time architecture upgrade (2026-01-19).
// Use useLivePlatformMetrics and useLiveFundSummary from '@/hooks/data/shared/useLivePlatformMetrics' instead.
