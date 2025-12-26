import { useQuery } from "@tanstack/react-query";
import { fetchInvestorPositions, InvestorPositionRow } from "@/services/investor";

/**
 * Hook to fetch investor positions with caching
 */
export function useInvestorPositions(investorId: string) {
  return useQuery<InvestorPositionRow[], Error>({
    queryKey: ["investor-positions", investorId],
    queryFn: () => fetchInvestorPositions(investorId),
    enabled: !!investorId,
  });
}