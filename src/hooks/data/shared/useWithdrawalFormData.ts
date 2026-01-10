import { useQuery } from "@tanstack/react-query";
import { withdrawalService } from "@/services";
import { fetchInvestorsForSelector } from "@/services/investor/investorDataService";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to fetch investor options for dropdown selection.
 * Uses investorDataService.fetchInvestorsForSelector directly.
 */
export function useInvestorOptions(enabled: boolean = true) {
  return useQuery({
    queryKey: QUERY_KEYS.investorOptions,
    queryFn: async () => {
      const items = await fetchInvestorsForSelector(false);
      return items.map((item) => ({
        id: item.id,
        email: item.email,
        displayName: item.displayName,
      }));
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch investor positions for withdrawal form.
 * Only returns positions with positive balance.
 */
export function usePositionsForWithdrawal(investorId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.investorPositionsForWithdrawal(investorId || ""),
    queryFn: () => withdrawalService.fetchPositionsForWithdrawal(investorId!),
    enabled: !!investorId,
    staleTime: 30 * 1000, // 30 seconds - positions change more frequently
  });
}
