/**
 * Investor Settings Hooks
 * React Query hooks for investor settings and report periods
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  getInvestorProfileForSettings,
  deleteInvestorProfile,
  updatePerformanceFee,
  getInvestorReportPeriods,
  type InvestorProfileData,
  type ReportPeriod,
} from "@/services/admin/investorSettingsService";

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
 * Hook to update an investor's performance fee
 */
export function useUpdatePerformanceFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investorId, feePct }: { investorId: string; feePct: number }) =>
      updatePerformanceFee(investorId, feePct),
    onSuccess: (_, { investorId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.investorProfileSettings(investorId),
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
