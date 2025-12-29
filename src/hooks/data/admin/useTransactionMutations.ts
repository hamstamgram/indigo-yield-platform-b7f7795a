/**
 * React Query mutations for transaction operations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminTransactionHistoryService } from "@/services/admin/adminTransactionHistoryService";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import type {
  UpdateTransactionParams,
  VoidTransactionParams,
} from "@/types/domains/transaction";

interface MutationContext {
  investorId?: string;
  fundId?: string;
}

/**
 * Hook providing transaction mutations
 */
export function useTransactionMutations() {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (params: UpdateTransactionParams & MutationContext) =>
      adminTransactionHistoryService.updateTransaction(params),
    onSuccess: (_, variables) => {
      toast.success("Transaction updated successfully");
      invalidateAfterTransaction(
        queryClient,
        variables.investorId,
        variables.fundId
      );
    },
    onError: (error: Error) => {
      console.error("Error updating transaction:", error);
      toast.error(error.message || "Failed to update transaction");
    },
  });

  const voidMutation = useMutation({
    mutationFn: (params: VoidTransactionParams & MutationContext) =>
      adminTransactionHistoryService.voidTransaction(params),
    onSuccess: (_, variables) => {
      toast.success("Transaction voided successfully");
      invalidateAfterTransaction(
        queryClient,
        variables.investorId,
        variables.fundId
      );
    },
    onError: (error: Error) => {
      console.error("Error voiding transaction:", error);
      toast.error(error.message || "Failed to void transaction");
    },
  });

  return {
    updateMutation,
    voidMutation,
  };
}
