/**
 * Investor Withdrawal Hooks
 *
 * React Query hooks for investor-facing withdrawal operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withdrawalService } from "@/services/investor";
import { auditLogService } from "@/services/shared";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { toast } from "sonner";
import { formatCrypto } from "@/utils/financial";

export interface WithdrawalPosition {
  fund_id: string;
  asset_symbol: string;
  amount: string;
}

/**
 * Hook for fetching investor's withdrawal history with optional search
 */
export function useInvestorWithdrawals(search?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.withdrawalRequests(search || undefined),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      return withdrawalService.getInvestorWithdrawals(user.id, search);
    },
  });
}

/**
 * Hook for fetching investor's available positions for withdrawal
 */
export function useWithdrawalPositions() {
  return useQuery<WithdrawalPosition[]>({
    queryKey: QUERY_KEYS.availableWithdrawalPositions,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      return withdrawalService.getInvestorWithdrawalPositions(user.id);
    },
  });
}

interface SubmitWithdrawalParams {
  fundId: string;
  amount: string;
  assetCode: string;
  notes?: string;
}

/**
 * Mutation hook for submitting investor withdrawal request
 */
export function useSubmitWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitWithdrawalParams) => {
      const requestId = await withdrawalService.submitInvestorWithdrawal({
        fundId: params.fundId,
        amount: params.amount,
        notes: params.notes,
      });

      // Log audit event
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await auditLogService.logEvent({
          actorUserId: user.id,
          action: "WITHDRAWAL_REQUEST_CREATED",
          entity: "withdrawal_requests",
          entityId: requestId,
          meta: {
            amount: params.amount,
            asset: params.assetCode,
          },
        });
      }

      return { requestId, amount: params.amount, assetCode: params.assetCode };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["withdrawalRequests"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.availableWithdrawalPositions });
      toast.success("Withdrawal Request Submitted", {
        description: `Your request for ${formatCrypto(result.amount, 8, result.assetCode)} has been submitted for approval.`,
      });
    },
    onError: (error: Error) => {
      toast.error("Withdrawal Request Failed", {
        description: error.message || "Unknown error occurred",
      });
    },
  });
}
