/**
 * Admin IB Payout Hooks
 * React Query hooks for admin IB payout operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/services/auth";
import { ibPayoutService } from "@/services/admin";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateAfterIBOperation } from "@/utils/cacheInvalidation";
import { toast } from "sonner";

export function useIBAllocationsForPayout(statusFilter: string) {
  return useQuery({
    queryKey: QUERY_KEYS.adminIbPayouts(statusFilter),
    queryFn: () => ibPayoutService.getAllocationsForPayout(statusFilter),
  });
}

export function useMarkAllocationsAsPaid() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => {
      if (!user?.id) throw new Error("Not authenticated");
      return ibPayoutService.markAllocationsAsPaid(ids, user.id);
    },
    onSuccess: (result) => {
      toast.success(`Marked ${result.count} commission(s) as paid`, {
        description: `Batch ID: ${result.batchId.slice(0, 8)}...`,
      });
      invalidateAfterIBOperation(queryClient);
    },
    onError: (error) => {
      toast.error("Failed to mark commissions as paid", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
