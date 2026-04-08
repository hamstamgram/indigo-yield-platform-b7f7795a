/**
 * Investor Queries
 * Basic query hooks for investors and assets.
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { adminInvestorService, type AdminInvestorSummary } from "@/services/admin";
import { assetService } from "@/services/shared";
import { AssetRef as Asset } from "@/types/asset";

export type { Asset };

/**
 * Basic useInvestors hook
 * Fetches summary list and active assets
 */
export function useInvestors() {
  const [searchTerm, setSearchTerm] = useState("");

  const assetsQuery = useQuery<Asset[]>({
    queryKey: QUERY_KEYS.assetsActive,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("is_active", true)
        .order("symbol");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const investorsQuery = useQuery<AdminInvestorSummary[]>({
    queryKey: QUERY_KEYS.investorsSummary,
    queryFn: () => adminInvestorService.getAllInvestorsWithSummary(),
    staleTime: 2 * 60 * 1000,
  });

  const investors = investorsQuery.data || [];

  // Basic search filter
  const filteredInvestors = investors.filter((inv) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.email.toLowerCase().includes(term) ||
      inv.firstName?.toLowerCase().includes(term) ||
      inv.lastName?.toLowerCase().includes(term)
    );
  });

  // Handle errors via toast effect
  useEffect(() => {
    if (investorsQuery.error || assetsQuery.error) {
      const err = investorsQuery.error || assetsQuery.error;
      toast.error(err instanceof Error ? err.message : "Failed to load investor data");
    }
  }, [investorsQuery.error, assetsQuery.error]);

  return {
    investors,
    filteredInvestors,
    searchTerm,
    setSearchTerm,
    loading: investorsQuery.isLoading,
    error: investorsQuery.error || assetsQuery.error,
    assets: assetsQuery.data || [],
    isAdmin: true,
    refetch: investorsQuery.refetch,
  };
}

/**
 * Fetches admin investor list with summary data (Alias for direct query use)
 */
export function useAdminInvestorsList() {
  return useQuery({
    queryKey: QUERY_KEYS.adminInvestors, // Note: kept original key
    queryFn: () => adminInvestorService.getAllInvestorsWithSummary(),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetches assets for admin views
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
    staleTime: 5 * 60 * 1000,
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
