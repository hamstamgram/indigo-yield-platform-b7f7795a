/**
 * Investor Settings Hooks
 * React Query hooks for investor settings and report periods
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  getInvestorProfileForSettings,
  deleteInvestorProfile,
  getInvestorReportPeriods,
  type InvestorProfileData,
  type ReportPeriod,
} from "@/features/admin/investors/services/investorSettingsService";
import { feeScheduleService } from "@/features/admin/investors/services/feeScheduleService";

/**
 * Hook to fetch investor profile for settings panel
 */
export function useInvestorProfileSettings(investorId: string) {
  return useQuery<InvestorProfileData>({
    queryKey: QUERY_KEYS.investorProfileSettings(investorId),
    queryFn: () => getInvestorProfileForSettings(investorId),
    enabled: !!investorId,
  });
}

/**
 * Hook to delete an investor profile
 */
export function useDeleteInvestorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInvestorProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorsList });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorProfileSettings("") });
    },
  });
}

/**
 * Hook to update an investor's global performance fee.
 * Now writes to investor_fee_schedule (fund_id=NULL, global entry)
 * instead of the removed profiles.fee_pct column.
 */
export function useUpdatePerformanceFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ investorId, feePct }: { investorId: string; feePct: number }) => {
      await feeScheduleService.upsertGlobalFee(investorId, feePct);
    },
    onSuccess: (_, { investorId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.investorProfileSettings(investorId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.feeSchedule(investorId),
      });
    },
  });
}

/**
 * Hook to fetch investor report periods
 */
export function useInvestorReportPeriods(investorId: string) {
  return useQuery<{ periods: ReportPeriod[]; latestPeriod: ReportPeriod | null }>({
    queryKey: QUERY_KEYS.investorReportPeriods(investorId),
    queryFn: () => getInvestorReportPeriods(investorId),
    enabled: !!investorId,
  });
}

// Re-export types
export type { InvestorProfileData, ReportPeriod };
