import { useQuery } from "@tanstack/react-query";
import { performanceService } from "@/services/shared";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useAuth } from "@/services/auth";

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
 * Get per-asset stats for the current investor
 * Returns individual fund stats - NO aggregation across different assets
 */
export function usePerAssetStats() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.perAssetStats,
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      return performanceService.getPerAssetStats(user.id);
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
