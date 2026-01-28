/**
 * Available Funds Hook
 * React Query hook for fetching available fund IDs
 */

import { useQuery } from "@tanstack/react-query";
import { getAvailableFunds } from "@/services/investor";

export function useAvailableFunds() {
  return useQuery({
    queryKey: ["funds", "available"],
    queryFn: getAvailableFunds,
    staleTime: 60_000,
  });
}
