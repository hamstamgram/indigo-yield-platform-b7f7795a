import { useQuery } from "@tanstack/react-query";
import { withdrawalService } from "@/services";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to fetch investor options for dropdown selection
 */
export function useInvestorOptions(enabled: boolean = true) {
  return useQuery({
    queryKey: QUERY_KEYS.investorOptions,
    queryFn: () => withdrawalService.fetchInvestorOptions(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch investor positions for withdrawal form
 * Only returns positions with positive balance
 */
export function usePositionsForWithdrawal(investorId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.investorPositionsForWithdrawal(investorId || ""),
    queryFn: () => withdrawalService.fetchPositionsForWithdrawal(investorId!),
    enabled: !!investorId,
    staleTime: 30 * 1000, // 30 seconds - positions change more frequently
  });
}

/**
 * @deprecated Use usePositionsForWithdrawal instead
 */
export const useInvestorPositions = usePositionsForWithdrawal;
