/**
 * useHasInvestorPositions Hook
 * Checks if the current user has any investor positions
 * Used for showing admin/investor portal switcher
 */

import { useQuery } from "@tanstack/react-query";
import { logError } from "@/lib/logger";
import { useAuth } from "@/services/auth";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";

interface UseHasInvestorPositionsResult {
  /** Whether the user has any investor positions */
  hasPositions: boolean;
  /** Whether the check is loading */
  isLoading: boolean;
  /** Number of positions */
  positionCount: number;
}

export function useHasInvestorPositions(): UseHasInvestorPositionsResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.investorPositions(user?.id || ""), "count"],
    queryFn: async () => {
      if (!user?.id) return { count: 0 };

      const { count, error } = await supabase
        .from("investor_positions")
        .select("*", { count: "exact", head: true })
        .eq("investor_id", user.id)
        .gt("current_value", 0);

      if (error) {
        logError("useHasInvestorPositions.queryFn", error);
        return { count: 0 };
      }

      return { count: count || 0 };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    hasPositions: (data?.count || 0) > 0,
    isLoading,
    positionCount: data?.count || 0,
  };
}

export default useHasInvestorPositions;
