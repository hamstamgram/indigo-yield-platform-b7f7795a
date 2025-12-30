/**
 * Portfolio Hooks
 * 
 * React Query hooks for investor portfolio operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { investorPortfolioService, type PortfolioPosition, type WithdrawalFormPosition } from "@/services";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { toast } from "sonner";
import { invalidateAfterWithdrawal } from "@/utils/cacheInvalidation";

/**
 * Hook for fetching investor's portfolio positions
 */
export function usePortfolioPositions() {
  return useQuery<PortfolioPosition[]>({
    queryKey: QUERY_KEYS.portfolioPositions,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      return investorPortfolioService.getPortfolioPositions(user.id);
    },
  });
}

/**
 * Hook for fetching investor's positions for withdrawal form
 */
export function useWithdrawalFormPositions() {
  return useQuery<WithdrawalFormPosition[]>({
    queryKey: ["withdrawalFormPositions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      return investorPortfolioService.getWithdrawalFormPositions(user.id);
    },
  });
}

/**
 * Hook for fetching investor's withdrawals with fund details
 */
export function useMyWithdrawalsWithFunds() {
  return useQuery({
    queryKey: ["myWithdrawalsWithFunds"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      return investorPortfolioService.getWithdrawalsWithFunds(user.id);
    },
  });
}

interface CreateWithdrawalParams {
  fundId: string;
  amount: number;
  type: string;
  notes?: string;
}

/**
 * Mutation hook for creating withdrawal request
 */
export function useCreateWithdrawalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateWithdrawalParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await investorPortfolioService.createWithdrawalRequest({
        investorId: user.id,
        fundId: params.fundId,
        amount: params.amount,
        type: params.type,
        notes: params.notes,
      });

      return { investorId: user.id, fundId: params.fundId };
    },
    onSuccess: (result) => {
      invalidateAfterWithdrawal(queryClient, result.investorId, result.fundId);
      queryClient.invalidateQueries({ queryKey: ["myWithdrawalsWithFunds"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawalFormPositions"] });
      toast.success("Withdrawal request submitted", {
        description: "Your withdrawal request has been submitted for review",
      });
    },
    onError: (error: Error) => {
      toast.error("Error creating withdrawal", {
        description: error.message || "Failed to create withdrawal request",
      });
    },
  });
}

export type { PortfolioPosition, WithdrawalFormPosition };
