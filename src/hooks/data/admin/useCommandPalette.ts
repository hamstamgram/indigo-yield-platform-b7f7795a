/**
 * Command Palette Hooks
 * React Query hooks for command palette search data
 */

import { useQuery } from "@tanstack/react-query";
import { commandPaletteService, type InvestorSearchResult } from "@/services";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to fetch investors for command palette search
 */
export function useCommandPaletteInvestors(isAdmin: boolean, isOpen: boolean) {
  return useQuery<InvestorSearchResult[]>({
    queryKey: QUERY_KEYS.adminInvestorSearch,
    queryFn: () => commandPaletteService.fetchInvestorsForSearch(),
    enabled: isAdmin && isOpen,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}

// Re-export types
export type { InvestorSearchResult };
