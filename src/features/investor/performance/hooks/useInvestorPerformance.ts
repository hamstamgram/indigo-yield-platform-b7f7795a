import { useQuery } from "@tanstack/react-query";
import { performanceService } from "@/services/shared";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useAuth } from "@/services/auth";
import { supabase } from "@/integrations/supabase/client";

export function useInvestorPerformance(assetCode?: string) {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.investorPerformance(assetCode),
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      return performanceService.getInvestorPerformance({
        userId: user.id,
        assetCode,
      });
    },
    // Wait for auth to be ready before fetching
    enabled: !!user && !loading,
  });
}

/**
 * Get per-asset stats for the current investor from pre-computed performance data.
 * Accepts optional periodId for viewing historical months.
 */
export function usePerAssetStats(periodId?: string) {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEYS.perAssetStats, periodId || "latest"],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      return performanceService.getPerAssetStats(user.id, periodId);
    },
    // Wait for auth to be ready before fetching
    enabled: !!user && !loading,
  });
}

/**
 * Get per-asset stats for a specific investor (admin use)
 */
export function useInvestorAssetStats(investorId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.investorAssetStats(investorId),
    queryFn: async () => {
      if (!investorId) throw new Error("Investor ID required");
      return performanceService.getPerAssetStats(investorId);
    },
    enabled: !!investorId,
  });
}

/**
 * Get available statement periods for the period selector dropdown
 */
export function useAvailableStatementPeriods() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ["statement-periods", "available", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Get periods that have performance data for this investor
      const { data } = await supabase
        .from("investor_fund_performance")
        .select("period_id, period:statement_periods!inner(id, year, month, period_end_date)")
        .eq("investor_id", user.id);

      if (!data || data.length === 0) return [];

      // Deduplicate by period_id
      const seen = new Set<string>();
      const periods: Array<{
        id: string;
        year: number;
        month: number;
        periodEndDate: string;
        label: string;
      }> = [];

      for (const row of data) {
        if (seen.has(row.period_id)) continue;
        seen.add(row.period_id);
        const p = (row as Record<string, unknown>).period as {
          id: string;
          year: number;
          month: number;
          period_end_date: string;
        } | null;
        if (!p) continue;
        periods.push({
          id: p.id,
          year: p.year,
          month: p.month,
          periodEndDate: p.period_end_date,
          label: new Date(p.year, p.month - 1).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
        });
      }

      // Sort descending by date
      periods.sort((a, b) => b.periodEndDate.localeCompare(a.periodEndDate));
      return periods;
    },
    enabled: !!user && !loading,
  });
}
