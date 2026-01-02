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
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Re-export types
export type { InvestorSearchResult };
