/**
 * Investor Mutations
 * Mutation hooks for investor operations (delete, etc.).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { deleteInvestorUser } from "@/services/admin";

/**
 * Mutation hook for deleting an investor
 */
export function useDeleteInvestor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (investorId: string) => deleteInvestorUser(investorId),
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
