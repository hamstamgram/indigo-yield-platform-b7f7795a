/**
 * React Query mutations for transaction operations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { adminTransactionHistoryService } from "@/features/admin/transactions/services/adminTransactionHistoryService";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import type {
  UpdateTransactionParams,
  VoidTransactionParams,
  UnvoidTransactionParams,
  BulkVoidTransactionParams,
  BulkUnvoidTransactionParams,
  BulkOperationResult,
  VoidAndReissueParams,
} from "@/types/domains/transaction";

interface MutationContext {
  investorId?: string;
  fundId?: string;
}

interface VoidAndReissueResult {
  success: boolean;
  voided_transaction_id: string;
  new_transaction_id: string;
  message?: string;
}

/**
 * Hook providing transaction mutations with optimistic updates
 */
export function useTransactionMutations() {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (params: UpdateTransactionParams & MutationContext) =>
      adminTransactionHistoryService.updateTransaction(params),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.adminTransactions,
      });

      // Snapshot for rollback
      const previousTransactions = queryClient.getQueriesData({
        queryKey: QUERY_KEYS.adminTransactions,
      });

      return { previousTransactions };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message || "Failed to update transaction");
    },
    onSuccess: () => {
      toast.success("Transaction updated successfully");
    },
    onSettled: (_, __, variables) => {
      invalidateAfterTransaction(queryClient, variables.investorId, variables.fundId);
    },
  });

  const voidMutation = useMutation({
    mutationFn: (params: VoidTransactionParams & MutationContext) =>
      adminTransactionHistoryService.voidTransaction(params),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.adminTransactions,
      });

      // Snapshot for rollback
      const previousTransactions = queryClient.getQueriesData({
        queryKey: QUERY_KEYS.adminTransactions,
      });

      return { previousTransactions };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message || "Failed to void transaction");
    },
    onSuccess: () => {
      toast.success("Transaction voided successfully");
    },
    onSettled: (_, __, variables) => {
      invalidateAfterTransaction(queryClient, variables.investorId, variables.fundId);
    },
  });

  /**
   * Void and reissue mutation - atomic operation to correct a transaction
   * This is the preferred method over updateMutation for finance-grade ledger immutability
   */
  const voidAndReissueMutation = useMutation({
    mutationFn: (params: VoidAndReissueParams & MutationContext) =>
      adminTransactionHistoryService.voidAndReissueTransaction(params),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.adminTransactions,
      });

      // Snapshot for rollback
      const previousTransactions = queryClient.getQueriesData({
        queryKey: QUERY_KEYS.adminTransactions,
      });

      return { previousTransactions };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      // Don't show toast here - let the component handle with platformError
    },
    onSuccess: (result: VoidAndReissueResult) => {
      // Toast handled by component for more context
    },
    onSettled: (_, __, variables) => {
      invalidateAfterTransaction(queryClient, variables.investorId, variables.fundId);
    },
  });

  const unvoidMutation = useMutation({
    mutationFn: (params: UnvoidTransactionParams & MutationContext) =>
      adminTransactionHistoryService.unvoidTransaction(params),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.adminTransactions });
      const previousTransactions = queryClient.getQueriesData({
        queryKey: QUERY_KEYS.adminTransactions,
      });
      return { previousTransactions };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message || "Failed to restore transaction");
    },
    onSuccess: () => {
      toast.success("Transaction restored successfully");
    },
    onSettled: (_, __, variables) => {
      invalidateAfterTransaction(queryClient, variables.investorId, variables.fundId);
    },
  });

  const bulkVoidMutation = useMutation({
    mutationFn: (params: BulkVoidTransactionParams) =>
      adminTransactionHistoryService.voidTransactionsBulk(params),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.adminTransactions });
      const previousTransactions = queryClient.getQueriesData({
        queryKey: QUERY_KEYS.adminTransactions,
      });
      return { previousTransactions };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message || "Failed to void transactions");
    },
    onSuccess: (result: BulkOperationResult) => {
      toast.success(`${result.count} transaction(s) voided successfully`);
    },
    onSettled: () => {
      invalidateAfterTransaction(queryClient);
    },
  });

  const voidAndReissueFullExitMutation = useMutation({
    mutationFn: (params: {
      transactionId: string;
      newAmount: string;
      newDate?: string;
      reason: string;
      investorId?: string;
      fundId?: string;
    }) => adminTransactionHistoryService.voidAndReissueFullExit(params),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.adminTransactions });
      const previousTransactions = queryClient.getQueriesData({
        queryKey: QUERY_KEYS.adminTransactions,
      });
      return { previousTransactions };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      // Toast handled by component
    },
    onSettled: (_, __, variables) => {
      invalidateAfterTransaction(queryClient, variables.investorId, variables.fundId);
    },
  });

  const bulkUnvoidMutation = useMutation({
    mutationFn: (params: BulkUnvoidTransactionParams) =>
      adminTransactionHistoryService.unvoidTransactionsBulk(params),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.adminTransactions });
      const previousTransactions = queryClient.getQueriesData({
        queryKey: QUERY_KEYS.adminTransactions,
      });
      return { previousTransactions };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message || "Failed to restore transactions");
    },
    onSuccess: (result: BulkOperationResult) => {
      toast.success(`${result.count} transaction(s) restored successfully`);
    },
    onSettled: () => {
      invalidateAfterTransaction(queryClient);
    },
  });

  return {
    updateMutation,
    voidMutation,
    unvoidMutation,
    voidAndReissueMutation,
    voidAndReissueFullExitMutation,
    bulkVoidMutation,
    bulkUnvoidMutation,
  };
}
