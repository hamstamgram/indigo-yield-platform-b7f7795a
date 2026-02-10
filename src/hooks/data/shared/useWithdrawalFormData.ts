import { useQuery } from "@tanstack/react-query";
import { withdrawalService } from "@/services/investor";
import { fetchInvestorsForSelector } from "@/services/investor/investorDataService";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to fetch investor options for dropdown selection.
 * Uses investorDataService.fetchInvestorsForSelector directly.
 * @param enabled - Whether the query is enabled
 * @param includeSystemAccounts - Whether to include fees_account in results
 */
export function useInvestorOptions(
  enabled: boolean = true,
  includeSystemAccounts: boolean = false
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.investorOptions, includeSystemAccounts],
    queryFn: async () => {
      const items = await fetchInvestorsForSelector(includeSystemAccounts);
      return items.map((item) => ({
        id: item.id,
        email: item.email,
        displayName: item.displayName,
        isSystemAccount: item.isSystemAccount ?? false,
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
