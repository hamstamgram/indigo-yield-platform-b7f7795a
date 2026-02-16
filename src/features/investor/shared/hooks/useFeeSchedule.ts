/**
 * Fee Schedule Hooks
 *
 * CRUD hooks for investor_fee_schedule table.
 * Used by the FeeScheduleSection in InvestorSettingsTab.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feeScheduleService } from "@/services/admin/feeScheduleService";
import { QUERY_KEYS } from "@/constants/queryKeys";

export interface FeeScheduleEntry {
  id: string;
  investor_id: string;
  fund_id: string | null;
  fee_pct: number;
  effective_date: string;
  end_date?: string | null;
  fund?: { name: string } | null;
}

/**
 * Fetch fee schedule entries for an investor
 */
export function useFeeSchedule(investorId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.investorFeeSchedule(investorId),
    queryFn: () => feeScheduleService.getFeeScheduleWithFunds(investorId),
    enabled: !!investorId,
  });
}

/**
 * Add a fee schedule entry
 */
export function useAddFeeScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      investorId: string;
      fundId: string | null;
      feePct: number;
      effectiveDate: string;
      endDate?: string | null;
    }) =>
      feeScheduleService.addFeeEntry({
        investorId: params.investorId,
        fundId: params.fundId,
        feePct: params.feePct,
        effectiveDate: params.effectiveDate,
        endDate: params.endDate,
      }),
    onSuccess: (_, { investorId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.investorFeeSchedule(investorId),
      });
    },
  });
}

/**
 * Delete a fee schedule entry
 */
export function useDeleteFeeScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { entryId: string; investorId: string }) =>
      feeScheduleService.deleteFeeEntry(params.entryId),
    onSuccess: (_, { investorId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.investorFeeSchedule(investorId),
      });
    },
  });
}
