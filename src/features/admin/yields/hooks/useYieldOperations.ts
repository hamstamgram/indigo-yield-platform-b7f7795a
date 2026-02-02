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
} from "@/services/admin";
import { useAuth } from "@/services/auth";
import { toast } from "sonner";
import { QUERY_KEYS, YIELD_RELATED_KEYS } from "@/constants/queryKeys";

/**
 * Hook to fetch active funds with AUM data
 */
export function useActiveFundsWithAUM() {
  return useQuery({
    queryKey: QUERY_KEYS.activeFundsWithAUM,
    queryFn: getActiveFundsWithAUM,
    staleTime: 5 * 1000, // 5 seconds - Fortune 500: near real-time updates
  });
}

/**
 * Hook to fetch fund investor composition
 */
export function useFundInvestorComposition(fundId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.fundInvestorComposition(fundId || undefined),
    queryFn: () => getFundInvestorComposition(fundId!),
    enabled: !!fundId,
  });
}

/**
 * Hook to apply yield distribution with optimistic updates
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
    onMutate: async ({ input }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.activeFundsWithAUM });
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.fundInvestorComposition(input.fundId),
      });

      // Snapshot previous values for rollback
      const previousFundsAUM = queryClient.getQueryData(QUERY_KEYS.activeFundsWithAUM);
      const previousComposition = queryClient.getQueryData(
        QUERY_KEYS.fundInvestorComposition(input.fundId)
      );

      return { previousFundsAUM, previousComposition, fundId: input.fundId };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousFundsAUM) {
        queryClient.setQueryData(QUERY_KEYS.activeFundsWithAUM, context.previousFundsAUM);
      }
      if (context?.previousComposition && context?.fundId) {
        queryClient.setQueryData(
          QUERY_KEYS.fundInvestorComposition(context.fundId),
          context.previousComposition
        );
      }
      toast.error(error.message || "Failed to apply yield");
    },
    onSuccess: () => {
      toast.success("Yield distributed successfully");
    },
    onSettled: async () => {
      // FIX 1: Await invalidation to prevent race conditions
      // Always refetch after mutation settles to ensure consistency
      const invalidationPromises = YIELD_RELATED_KEYS.map((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      await Promise.all(invalidationPromises);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeFundsWithAUM });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });
      // Force immediate refetch for AUM cards
      await queryClient.refetchQueries({ queryKey: QUERY_KEYS.fundAumAll });
      await queryClient.refetchQueries({ queryKey: QUERY_KEYS.fundAumUnified });
    },
  });
}

// Re-export types
export type { YieldCalculationInput };
