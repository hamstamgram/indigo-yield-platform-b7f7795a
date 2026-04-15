import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { queryView, type VLiquidityRisk, type VConcentrationRisk } from "@/lib/db/viewTypes";

export type { VLiquidityRisk as LiquidityRisk, VConcentrationRisk as ConcentrationRisk };

function isMissingViewError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { code?: string; message?: string; status?: number };
  return (
    err.code === "42P01" ||
    err.status === 404 ||
    (err.message?.includes("does not exist") ?? false) ||
    (err.message?.includes("not found in the schema cache") ?? false)
  );
}

export function useLiquidityRisk() {
  return useQuery({
    queryKey: QUERY_KEYS.liquidityRisk,
    queryFn: async () => {
      const { data, error } = await queryView("v_liquidity_risk").select("*");
      if (error) {
        if (isMissingViewError(error)) return [] as VLiquidityRisk[];
        throw error;
      }
      return (data || []) as VLiquidityRisk[];
    },
    retry: (failureCount, error) => {
      if (isMissingViewError(error)) return false;
      return failureCount < 2;
    },
    refetchInterval: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useConcentrationRisk() {
  return useQuery({
    queryKey: QUERY_KEYS.concentrationRisk,
    queryFn: async () => {
      const { data, error } = await queryView("v_concentration_risk")
        .select("*")
        .in("concentration_level", ["MEDIUM", "HIGH", "CRITICAL"])
        .order("ownership_pct", { ascending: false })
        .limit(20);
      if (error) {
        if (isMissingViewError(error)) return [] as VConcentrationRisk[];
        throw error;
      }
      return (data || []) as VConcentrationRisk[];
    },
    retry: (failureCount, error) => {
      if (isMissingViewError(error)) return false;
      return failureCount < 2;
    },
    refetchInterval: false,
    staleTime: 5 * 60 * 1000,
  });
}
