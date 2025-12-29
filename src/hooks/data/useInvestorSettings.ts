/**
 * Investor Settings Hooks
 * React Query hooks for investor settings and report periods
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInvestorProfileForSettings,
  deleteInvestorProfile,
  getInvestorReportPeriods,
  type InvestorProfileData,
  type ReportPeriod,
} from "@/services/admin/investorSettingsService";

/**
 * Hook to fetch investor profile for settings panel
 */
export function useInvestorProfileSettings(investorId: string) {
  return useQuery<InvestorProfileData>({
    queryKey: ["investor-profile-settings", investorId],
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
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["investor-profile-settings"] });
    },
  });
}

/**
 * Hook to fetch investor report periods
 */
export function useInvestorReportPeriods(investorId: string) {
  return useQuery<{ periods: ReportPeriod[]; latestPeriod: ReportPeriod | null }>({
    queryKey: ["investor-report-periods", investorId],
    queryFn: () => getInvestorReportPeriods(investorId),
    enabled: !!investorId,
  });
}

// Re-export types
export type { InvestorProfileData, ReportPeriod };
