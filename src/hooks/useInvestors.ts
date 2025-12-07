import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Asset } from "@/types/investorTypes";
import { adminServiceV2, InvestorSummaryV2 } from "@/services/adminServiceV2";
import { useInvestorSearch } from "./useInvestorSearch";
import { supabase } from "@/integrations/supabase/client";

export const useInvestors = () => {
  const [investors, setInvestors] = useState<InvestorSummaryV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(false);
  const { toast } = useToast();

  // Set up search functionality
  const { searchTerm, setSearchTerm, filteredInvestors } = useInvestorSearch(investors);

  // Define fetchData outside of useEffect to use with refetch
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real assets from Supabase database
      const { data: assetsData, error: assetsError } = await supabase
        .from("assets")
        .select("*")
        .eq("is_active", true)
        .order("symbol");

      if (assetsError) {
        throw new Error(`Failed to fetch assets: ${assetsError.message}`);
      }
      setAssets(assetsData || []);

      // Fetch investors with summary using adminServiceV2
      const investorsWithSummary = await adminServiceV2.getAllInvestorsWithSummary();

      setInvestors(investorsWithSummary);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load investor data");
      console.error("Error in main investor data fetch:", error);
      setError(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setInvestors([]);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Provide a refetch method to refresh data
  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    investors,
    filteredInvestors,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    assets,
    isAdmin,
    refetch,
  };
};
