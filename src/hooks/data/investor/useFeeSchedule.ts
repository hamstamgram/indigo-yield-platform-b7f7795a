/**
 * Fee Schedule Hooks
 * Query and mutation hooks for investor fee schedule management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { feeScheduleService } from "@/services/admin/feeScheduleService";
import { toast } from "sonner";

export interface FeeScheduleEntry {
  id: string;
  investor_id: string;
  fund_id: string | null;
  fee_pct: number;
  effective_date: string;
  end_date?: string | null;
  fund?: { name: string } | null;
}

export function useFeeSchedule(investorId: string | undefined) {
  return useQuery<FeeScheduleEntry[]>({
    queryKey: [QUERY_KEYS.investorFeeSchedule, investorId],
    queryFn: () => feeScheduleService.getFeeScheduleWithFunds(investorId!),
    enabled: !!investorId,
  });
}

export function useAddFeeScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      investorId: string;
      fundId: string | null;
      feePct: number;
      effectiveDate: string;
    }) => feeScheduleService.addFeeEntry(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.investorFeeSchedule, variables.investorId],
      });
      toast.success("Fee schedule entry added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add fee schedule entry");
    },
  });
}

export function useDeleteFeeScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { entryId: string; investorId: string }) =>
      feeScheduleService.deleteFeeEntry(params.entryId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.investorFeeSchedule, variables.investorId],
      });
      toast.success("Fee schedule entry deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete fee schedule entry");
    },
  });
}
