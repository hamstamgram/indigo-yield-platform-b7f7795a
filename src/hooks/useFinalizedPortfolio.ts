/**
 * Hook to get finalized (month-end) portfolio data for investors
 * Only shows data that has been finalized for reporting - no mid-month values
 */

import { useQuery } from "@tanstack/react-query";
import { performanceService } from "@/services/performanceService";
import { supabase } from "@/integrations/supabase/client";

export function useFinalizedPortfolio() {
  return useQuery({
    queryKey: ["finalized-portfolio"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      return performanceService.getFinalizedInvestorData(user.id);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
