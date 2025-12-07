import { useQuery } from "@tanstack/react-query";
import { performanceService } from "@/services/performanceService";
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

export function usePortfolioStats() {
  return useQuery({
    queryKey: ["portfolio-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      return performanceService.getAggregatedStats(user.id);
    }
  });
}
