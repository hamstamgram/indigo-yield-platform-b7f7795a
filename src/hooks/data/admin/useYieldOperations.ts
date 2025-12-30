/**
 * Yield Operations Hooks
 * React Query hooks for yield distribution operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getActiveFundsWithAUM,
  getFundInvestorComposition,
  applyYieldDistribution,
  type YieldCalculationInput,
} from "@/services";
import { useAuth } from "@/lib/auth/context";
import { toast } from "sonner";
import { QUERY_KEYS, YIELD_RELATED_KEYS } from "@/constants/queryKeys";

/**
 * Hook to fetch active funds with AUM data
 */
export function useActiveFundsWithAUM() {
  return useQuery({
    queryKey: ["active-funds-with-aum"],
    queryFn: getActiveFundsWithAUM,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch fund investor composition
 */
export function useFundInvestorComposition(fundId: string | null) {
  return useQuery({
    queryKey: ["fundInvestorComposition", fundId],
    queryFn: () => getFundInvestorComposition(fundId!),
    enabled: !!fundId,
  });
}

/**
 * Hook to apply yield distribution
 */
export function useApplyYieldDistribution() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      input,
      purpose = "reporting",
    }: {
      input: YieldCalculationInput;
      purpose?: "reporting" | "transaction";
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      return applyYieldDistribution(input, user.id, purpose);
    },
    onSuccess: () => {
      // Comprehensive cache invalidation
      YIELD_RELATED_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: ["active-funds-with-aum"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });
      toast.success("Yield distributed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to apply yield");
    },
  });
}

// Re-export types
export type { YieldCalculationInput };
