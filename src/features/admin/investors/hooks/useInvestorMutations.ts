/**
 * Investor Mutations
 * Mutation hooks for investor operations (delete, etc.).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { deleteInvestorUser } from "@/services/admin";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mutation hook for deleting an investor.
 * Pre-flight check: blocks deletion if investor has non-zero positions.
 */
export function useDeleteInvestor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (investorId: string) => {
      const { data: activePositions } = await supabase
        .from("investor_positions")
        .select("fund_id, current_value, funds:fund_id(name)")
        .eq("investor_id", investorId)
        .gt("current_value", 0);

      if (activePositions && activePositions.length > 0) {
        const details = activePositions
          .map((p) => {
            const fundName = (p.funds as unknown as { name: string })?.name ?? p.fund_id;
            return `${p.current_value} in ${fundName}`;
          })
          .join(", ");
        throw new Error(
          `Cannot delete investor with active balance: ${details}. Withdraw or transfer first.`
        );
      }

      return deleteInvestorUser(investorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInvestors });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorsSummary });
      toast.success("Investor deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete investor");
    },
  });
}

/**
 * Hook for creating investors (Legacy/Simple).
 * For complex creation, use useCreateInvestorWizard.
 */
export function useCreateInvestor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from("profiles")
        .insert([{
          ...data,
          status: data.status || "pending",
          is_admin: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInvestors });
      toast.success("Investor created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create investor");
    },
  });
}
