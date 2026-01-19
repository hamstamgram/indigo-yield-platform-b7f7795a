/**
 * useFundAumAsOf - Hook for fetching historical AUM as of a specific date
 * This is the authoritative read path for yield operations
 */

import { useQuery } from "@tanstack/react-query";
import { preflowAumService } from "@/services/admin/preflowAumService";
import { QUERY_KEYS } from "@/constants/queryKeys";

export type AumPurpose = "reporting" | "transaction";

/**
 * Fetches the fund AUM as of a specific date using the backend RPC
 * This ensures the UI shows historical AUM, not current positions
 * 
 * @param fundId - The fund UUID
 * @param asOfDate - ISO date string (YYYY-MM-DD) for the as-of date
 * @param purpose - 'reporting' for month-end or 'transaction' for mid-month
 */
export function useFundAumAsOf(
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
      
      if (import.meta.env.DEV) {
        console.log("[useFundAumAsOf] Fetching AUM:", {
          fundId,
          asOfDate,
          purpose,
        });
      }
      
      const result = await preflowAumService.getFundAumAsOf(fundId, asOfDate, purpose);
      
      if (import.meta.env.DEV) {
        console.log("[useFundAumAsOf] Result:", {
          asOfDate,
          aumValue: result,
        });
      }
      
      return result;
    },
    enabled: !!fundId && !!asOfDate,
    staleTime: 30_000, // 30 seconds - historical data doesn't change often
    gcTime: 5 * 60_000, // 5 minutes cache (gcTime is correct for React Query v5)
  });
}
