import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Asset } from "@/types/investorTypes";
import { adminServiceV2, InvestorSummaryV2 } from "@/services/adminServiceV2";
import { useInvestorSearch } from "./useInvestorSearch";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_KEYS } from "@/utils/performance/caching";
import { useEffect } from "react";

/**
 * useInvestors hook - optimized with React Query for caching and deduplication
 * Returns the same interface as before for backward compatibility
 */
export const useInvestors = () => {
  const { toast } = useToast();

  // Fetch assets with React Query (assets change rarely, longer staleTime)
  const { data: assets = [], error: assetsError } = useQuery<Asset[]>({
    queryKey: ["assets-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("is_active", true)
        .order("symbol");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - assets rarely change
  });

  // Fetch investors with React Query
  const {
    data: investors = [],
    isLoading: loading,
    error: investorsError,
    refetch,
  } = useQuery<InvestorSummaryV2[]>({
    queryKey: [CACHE_KEYS.ADMIN_USERS, "investors-summary"],
    queryFn: async () => {
      return await adminServiceV2.getAllInvestorsWithSummary();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for investor data
  });

  // Combine errors
  const error = investorsError || assetsError;

  // Show error toast if query fails (only once per error)
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load investor data",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Search functionality (same as before)
  const { searchTerm, setSearchTerm, filteredInvestors } = useInvestorSearch(investors);

  // Return the same interface for backward compatibility
  return {
    investors,
    filteredInvestors,
    searchTerm,
    setSearchTerm,
    loading,
    error: error ? (error instanceof Error ? error : new Error("Unknown error")) : null,
    assets,
    isAdmin: true, // This hook is only used in admin context
    refetch,
  };
};
