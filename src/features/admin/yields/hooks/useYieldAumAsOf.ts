/**
 * useYieldAumAsOf - Authoritative hook for yield-operational AUM retrieval
 */

import { useQuery } from "@tanstack/react-query";
import { yieldAumService, type AumPurpose } from "@/features/admin/yields/services/yields/yieldAumService";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Fetches the fund AUM as of a specific date using the consolidated yieldAumService.
 *
 * @param fundId - The fund UUID
 * @param asOfDate - ISO date string (YYYY-MM-DD)
 * @param purpose - 'reporting' or 'transaction'
 */
export function useYieldAumAsOf(
  fundId: string | null,
  asOfDate: string | null,
  purpose: AumPurpose = "reporting"
) {
  return useQuery({
    queryKey: QUERY_KEYS.fundAumAsOf(fundId, asOfDate, purpose),
    queryFn: async () => {
      if (!fundId || !asOfDate) {
        throw new Error("fundId and asOfDate are required");
      }
      return yieldAumService.getFundAumAsOf(fundId, asOfDate, purpose);
    },
    enabled: !!fundId && !!asOfDate,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
