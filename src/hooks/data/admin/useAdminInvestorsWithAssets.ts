/**
 * Admin Investors with Assets Hook
 * 
 * React Query hook for fetching admin investor list with assets.
 * Replaces manual useState/useEffect pattern in InvestorsListPage.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminInvestorService, AdminInvestorSummary, deleteInvestorUser } from "@/services/admin";
import { assetService } from "@/services/shared";
import { AssetRef as Asset } from "@/types/asset";
import { useToast } from "@/hooks";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Fetches admin investor list with summary data
 */
export function useAdminInvestorsList() {
  return useQuery({
    queryKey: QUERY_KEYS.adminInvestors,
    queryFn: () => adminInvestorService.getAllInvestorsWithSummary(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetches assets transformed for investor table display
 */
export function useAdminAssets() {
  return useQuery({
    queryKey: QUERY_KEYS.assets(),
    queryFn: async (): Promise<Asset[]> => {
      const assetsData = await assetService.getAssets();
      return assetsData.map((a) => ({
        id: parseInt(a.asset_id.split("-")[0]) || 0,
        symbol: a.symbol,
        name: a.name,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - assets change rarely
  });
}

/**
 * Combined hook for InvestorsListPage data needs
 */
export function useAdminInvestorsWithAssets() {
  const investorsQuery = useAdminInvestorsList();
  const assetsQuery = useAdminAssets();

  return {
    investors: investorsQuery.data ?? [],
    assets: assetsQuery.data ?? [],
    isLoading: investorsQuery.isLoading || assetsQuery.isLoading,
    isError: investorsQuery.isError || assetsQuery.isError,
    error: investorsQuery.error || assetsQuery.error,
    refetch: () => {
      investorsQuery.refetch();
      assetsQuery.refetch();
    },
  };
}

/**
 * Mutation hook for deleting an investor
 */
export function useDeleteInvestor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (investorId: string) => deleteInvestorUser(investorId),
    onSuccess: () => {
      // Invalidate investor list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInvestors });
      toast({
        title: "Investor deleted",
        description: "The investor has been successfully removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete investor",
        variant: "destructive",
      });
    },
  });
}

// Re-export type for convenience
export type { AdminInvestorSummary };
