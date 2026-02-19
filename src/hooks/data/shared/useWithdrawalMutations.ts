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
import { supabase } from "@/integrations/supabase/client";

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
          errors.push(`${id}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (errors.length > 0) {
        const succeeded = withdrawalIds.length - errors.length;
        if (succeeded === 0) {
          throw new Error(`All deletions failed. First error: ${errors[0]}`);
        }
        // Partial success - log audit and report
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await supabase.from("audit_log").insert({
          actor_user: user?.id ?? null,
          action: "BULK_WITHDRAWALS_DELETED_PARTIAL",
          entity: "withdrawal_requests",
          entity_id: withdrawalIds.join(","),
          old_values: { total: withdrawalIds.length, succeeded, failed: errors.length },
        });
        throw new Error(
          `${succeeded} of ${withdrawalIds.length} deleted. ${errors.length} failed.`
        );
      }

      // Full success audit
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        actor_user: user?.id ?? null,
        action: "BULK_WITHDRAWALS_DELETED",
        entity: "withdrawal_requests",
        entity_id: withdrawalIds.join(","),
        old_values: {
          count: withdrawalIds.length,
          ids: withdrawalIds,
          hard_delete: hardDelete,
          reason,
        },
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
      toast.error("Bulk delete failed", { description: error.message });
      // Still invalidate in case of partial success
      invalidateAfterWithdrawal(queryClient);
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    routeToFeesMutation,
    bulkDeleteMutation,
  };
}
