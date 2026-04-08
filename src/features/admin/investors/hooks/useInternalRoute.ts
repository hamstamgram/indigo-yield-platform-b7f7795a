/**
 * Internal Route Hooks
 * React Query hooks for internal routing operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { toast } from "sonner";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { internalRouteService } from "@/features/admin/shared/services/internalRouteService";
import {
  type InvestorPositionForRoute,
  type InternalRouteParams,
  type InternalRouteResult,
} from "@/services/admin";

/**
 * Hook to fetch investor positions for internal routing
 */
export function useInvestorPositionsForRoute(investorId: string, enabled: boolean) {
  return useQuery<InvestorPositionForRoute[]>({
    queryKey: QUERY_KEYS.investorPositionsForRoute(investorId),
    queryFn: () => internalRouteService.fetchInvestorPositionsForRoute(investorId),
    enabled: enabled && !!investorId,
  });
}

/**
 * Hook to execute internal route mutation
 */
export function useInternalRouteMutation(investorId: string, fundId: string) {
  const queryClient = useQueryClient();

  return useMutation<InternalRouteResult, Error, InternalRouteParams>({
    mutationFn: internalRouteService.executeInternalRoute,
    onSuccess: () => {
      toast.success("Internal transfer completed successfully");
      invalidateAfterTransaction(queryClient, investorId, fundId);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

// Re-export types
export type { InvestorPositionForRoute, InternalRouteParams, InternalRouteResult };
