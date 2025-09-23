import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Asset } from "@/types/investorTypes";
import { adminServiceV2, InvestorSummaryV2 } from "@/services/adminServiceV2";
import { useInvestorSearch } from "./useInvestorSearch";

export const useInvestors = () => {
  const [investors, setInvestors] = useState<InvestorSummaryV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(false);
  const { toast } = useToast();
  
  // Set up search functionality
  const { searchTerm, setSearchTerm, filteredInvestors } = useInvestorSearch(investors);

  // Define fetchData outside of useEffect to use with refetch
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching investor data...");
      
      // Fetch assets - use mock data for now
      const mockAssets = [
        { id: 1, symbol: 'USDC', name: 'USD Coin', is_active: true },
        { id: 2, symbol: 'ETH', name: 'Ethereum', is_active: true }
      ];
      setAssets(mockAssets);
      
      // Fetch investors with summary using adminServiceV2
      const investorsWithSummary = await adminServiceV2.getAllInvestorsWithSummary();
      
      setInvestors(investorsWithSummary);
      console.log("Loaded investors with consolidated service:", investorsWithSummary.length);
      
    } catch (error) {
      console.error('Error in main investor data fetch:', error);
      toast({
        title: "Error",
        description: "Failed to load investor data",
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
    console.log("Refetching investor data...");
    fetchData();
  }, [fetchData]);
  
  return {
    investors,
    filteredInvestors,
    searchTerm,
    setSearchTerm,
    loading,
    assets,
    isAdmin,
    refetch
  };
};