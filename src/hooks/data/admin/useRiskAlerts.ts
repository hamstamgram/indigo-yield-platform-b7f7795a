import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";
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

export interface PlatformMetrics {
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

export interface FundSummary {
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
  latest_aum: number;
  latest_aum_date: string;
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

/**
 * @deprecated Use useLivePlatformMetrics from '@/hooks/data/shared/useLivePlatformMetrics' instead.
 * This hook queries a materialized view that requires manual refresh.
 * The new live hook queries a real-time view that computes on-read.
 */
export function usePlatformMetrics() {
  return useQuery({
    queryKey: ["platform-metrics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mv_daily_platform_metrics")
        .select("*")
        .single();
      if (error) throw error;
      return data as PlatformMetrics;
    },
    ...QUERY_DEFAULTS.dashboard,
    refetchInterval: REFETCH_INTERVAL.LOW,
  });
}

/**
 * @deprecated Use useLiveFundSummary from '@/hooks/data/shared/useLivePlatformMetrics' instead.
 * This hook queries a materialized view that requires manual refresh.
 */
export function useFundSummaries() {
  return useQuery({
    queryKey: ["fund-summaries"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mv_fund_summary")
        .select("*")
        .order("investor_aum", { ascending: false });
      if (error) throw error;
      return data as FundSummary[];
    },
    ...QUERY_DEFAULTS.dashboard,
    refetchInterval: REFETCH_INTERVAL.LOW,
  });
}

/**
 * @deprecated Materialized views are no longer used for live metrics.
 * The platform now uses live views (v_fund_summary_live, v_daily_platform_metrics_live)
 * that compute in real-time. This mutation is kept for backward compatibility only.
 */
export function useRefreshMaterializedViews() {
  return useMutation({
    mutationFn: async () => {
      console.warn('[DEPRECATED] useRefreshMaterializedViews called - platform now uses live views');
      // No-op - MVs are not used for live metrics anymore
      return { success: true };
    },
  });
}
