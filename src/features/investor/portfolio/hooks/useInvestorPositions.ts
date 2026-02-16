import { useQuery } from "@tanstack/react-query";
import { fetchInvestorPositions, InvestorPositionRow } from "@/services/investor";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { STALE_TIME } from "@/constants/queryConfig";

/**
 * Hook to fetch investor positions with caching
 */
export function useInvestorPositions(investorId: string) {
  return useQuery<InvestorPositionRow[], Error>({
    queryKey: QUERY_KEYS.investorPositions(investorId),
    queryFn: () => fetchInvestorPositions(investorId),
    enabled: !!investorId,
    staleTime: STALE_TIME.FINANCIAL,
    refetchOnWindowFocus: true,
  });
}
