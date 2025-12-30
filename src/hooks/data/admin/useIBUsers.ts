/**
 * IB Users Hooks
 * React Query hooks for fetching Introducing Broker users
 */

import { useQuery } from "@tanstack/react-query";
import { ibUsersService, type IBUser } from "@/services";

/**
 * Hook to fetch all IB users
 */
export function useIBUsers() {
  return useQuery<IBUser[]>({
    queryKey: ["admin", "ibUsers"],
    queryFn: ibUsersService.fetchIBUsers,
    staleTime: 60000, // Cache for 1 minute
  });
}

// Re-export types
export type { IBUser };
