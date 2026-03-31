import { useMutation, useQueryClient } from "@tanstack/react-query";
import { withdrawalService } from "@/services/investor";
import {
  CreateWithdrawalParams,
  UpdateWithdrawalParams,
  DeleteWithdrawalParams,
  RouteToFeesParams,
} from "@/types/domains";
import { invalidateAfterWithdrawal } from "@/utils/cacheInvalidation";
import { toast } from "sonner";

interface WithdrawalContext {
  investorId?: string;
  fundId?: string;
  withdrawalId?: string;
}

/**
 * Hook providing mutations for withdrawal operations
 */
export function useWithdrawalMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (params: CreateWithdrawalParams) => withdrawalService.createWithdrawal(params),
    onSuccess: (_, params) => {
      invalidateAfterWithdrawal(queryClient, params.investorId, params.fundId);
      toast.success("Withdrawal request created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create withdrawal request");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: UpdateWithdrawalParams & WithdrawalContext) =>
      withdrawalService.updateWithdrawal(params),
    onSuccess: (_, params) => {
      invalidateAfterWithdrawal(queryClient, params.investorId, params.fundId, params.withdrawalId);
      toast.success("Withdrawal updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update withdrawal");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (params: DeleteWithdrawalParams & WithdrawalContext) =>
      withdrawalService.deleteWithdrawal(params),
    onSuccess: (_, params) => {
      invalidateAfterWithdrawal(queryClient, params.investorId, params.fundId);
      toast.success(params.hardDelete ? "Withdrawal permanently deleted" : "Withdrawal cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete withdrawal");
    },
  });

  const routeToFeesMutation = useMutation({
    mutationFn: (params: RouteToFeesParams & WithdrawalContext) =>
      withdrawalService.routeToFees(params),
    onSuccess: (_, params) => {
      invalidateAfterWithdrawal(queryClient, params.investorId, params.fundId, params.withdrawalId);
      toast.success("Withdrawal routed to INDIGO FEES successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to route withdrawal to INDIGO FEES");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({
      withdrawalIds,
      reason,
      hardDelete,
    }: {
      withdrawalIds: string[];
      reason: string;
      hardDelete: boolean;
    }) => {
      if (withdrawalIds.length === 0) throw new Error("No withdrawal IDs provided");

      // Process each withdrawal through the existing RPC for consistency
      const errors: string[] = [];
      for (const id of withdrawalIds) {
        try {
          await withdrawalService.deleteWithdrawal({
            withdrawalId: id,
            reason,
            hardDelete,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${id}: ${msg}`);
        }
      }

      if (errors.length > 0) {
        const succeeded = withdrawalIds.length - errors.length;
        if (succeeded === 0) {
          throw new Error(`All deletions failed. First error: ${errors[0]}`);
        }
        await withdrawalService.logBulkAudit("BULK_WITHDRAWALS_DELETED_PARTIAL", withdrawalIds, {
          total: withdrawalIds.length,
          succeeded,
          failed: errors.length,
        });
        throw new Error(
          `${succeeded} of ${withdrawalIds.length} deleted. ${errors.length} failed.`
        );
      }

      await withdrawalService.logBulkAudit("BULK_WITHDRAWALS_DELETED", withdrawalIds, {
        count: withdrawalIds.length,
        ids: withdrawalIds,
        hard_delete: hardDelete,
        reason,
      });
    },
    onSuccess: (_, params) => {
      const label = params.hardDelete ? "permanently deleted" : "cancelled";
      toast.success(
        `${params.withdrawalIds.length} withdrawal${params.withdrawalIds.length !== 1 ? "s" : ""} ${label}`
      );
      invalidateAfterWithdrawal(queryClient);
    },
    onError: (error: Error) => {
      toast.error("Bulk delete failed", {
        description: error?.message || String(error),
      });
      invalidateAfterWithdrawal(queryClient);
    },
  });

  const bulkVoidMutation = useMutation({
    mutationFn: async ({ withdrawalIds, reason }: { withdrawalIds: string[]; reason: string }) => {
      if (withdrawalIds.length === 0) throw new Error("No withdrawal IDs provided");

      const errors: string[] = [];
      for (const id of withdrawalIds) {
        try {
          await withdrawalService.cancelWithdrawal(id, reason);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${id}: ${msg}`);
        }
      }

      if (errors.length > 0) {
        const succeeded = withdrawalIds.length - errors.length;
        if (succeeded === 0) {
          throw new Error(`All void operations failed. First error: ${errors[0]}`);
        }
        await withdrawalService.logBulkAudit("BULK_WITHDRAWALS_VOIDED_PARTIAL", withdrawalIds, {
          total: withdrawalIds.length,
          succeeded,
          failed: errors.length,
          reason,
        });
        throw new Error(`${succeeded} of ${withdrawalIds.length} voided. ${errors.length} failed.`);
      }

      await withdrawalService.logBulkAudit("BULK_WITHDRAWALS_VOIDED", withdrawalIds, {
        count: withdrawalIds.length,
        ids: withdrawalIds,
        reason,
      });
    },
    onSuccess: (_, params) => {
      toast.success(
        `${params.withdrawalIds.length} withdrawal${params.withdrawalIds.length !== 1 ? "s" : ""} voided`
      );
      invalidateAfterWithdrawal(queryClient);
    },
    onError: (error: Error) => {
      toast.error("Bulk void failed", {
        description: error?.message || String(error),
      });
      invalidateAfterWithdrawal(queryClient);
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async ({ withdrawalIds, reason }: { withdrawalIds: string[]; reason: string }) => {
      if (withdrawalIds.length === 0) throw new Error("No withdrawal IDs provided");

      const errors: string[] = [];
      for (const id of withdrawalIds) {
        try {
          await withdrawalService.restoreWithdrawal(id, reason);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${id}: ${msg}`);
        }
      }

      if (errors.length > 0) {
        const succeeded = withdrawalIds.length - errors.length;
        if (succeeded === 0) {
          throw new Error(`All restore operations failed. First error: ${errors[0]}`);
        }
        await withdrawalService.logBulkAudit("BULK_WITHDRAWALS_RESTORED_PARTIAL", withdrawalIds, {
          total: withdrawalIds.length,
          succeeded,
          failed: errors.length,
          reason,
        });
        throw new Error(
          `${succeeded} of ${withdrawalIds.length} restored. ${errors.length} failed.`
        );
      }

      await withdrawalService.logBulkAudit("BULK_WITHDRAWALS_RESTORED", withdrawalIds, {
        count: withdrawalIds.length,
        ids: withdrawalIds,
        reason,
      });
    },
    onSuccess: (_, params) => {
      toast.success(
        `${params.withdrawalIds.length} withdrawal${params.withdrawalIds.length !== 1 ? "s" : ""} restored`
      );
      invalidateAfterWithdrawal(queryClient);
    },
    onError: (error: Error) => {
      toast.error("Bulk restore failed", {
        description: error?.message || String(error),
      });
      invalidateAfterWithdrawal(queryClient);
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    routeToFeesMutation,
    bulkDeleteMutation,
    bulkVoidMutation,
    bulkRestoreMutation,
  };
}
