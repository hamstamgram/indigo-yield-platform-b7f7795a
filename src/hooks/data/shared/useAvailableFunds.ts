/**
 * Available Funds Hook
 * React Query hook for fetching available fund IDs
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { getAvailableFunds } from "@/services/investor";

export function useAvailableFunds() {
  return useQuery({
    queryKey: QUERY_KEYS.fundsAvailable,
    queryFn: getAvailableFunds,
    staleTime: 60_000,
  });
}
