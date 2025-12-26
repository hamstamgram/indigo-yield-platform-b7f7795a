import { useQuery } from "@tanstack/react-query";
import { performanceService } from "@/services/shared/performanceService";
import { supabase } from "@/integrations/supabase/client";

export function useInvestorPerformance(assetCode?: string) {
  return useQuery({
    queryKey: ["investor-performance", assetCode],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      return performanceService.getInvestorPerformance({
        userId: user.id,
        assetCode
      });
    }
  });
}

/**
 * Get per-asset stats for the current investor
 * Returns individual fund stats - NO aggregation across different assets
 */
export function usePerAssetStats() {
  return useQuery({
    queryKey: ["per-asset-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      return performanceService.getPerAssetStats(user.id);
    }
  });
}

/**
 * Get per-asset stats for a specific investor (admin use)
 */
export function useInvestorAssetStats(investorId: string | undefined) {
  return useQuery({
    queryKey: ["investor-asset-stats", investorId],
    queryFn: async () => {
      if (!investorId) throw new Error("Investor ID required");
      return performanceService.getPerAssetStats(investorId);
    },
    enabled: !!investorId
  });
}
