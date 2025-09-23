
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Investor, Asset } from "@/types/investorTypes";
import { 
  checkAdminStatus, 
  fetchInvestors, 
  fetchPendingInvites 
} from "@/services/investorService";
import { fetchAssets, enrichInvestorsWithPortfolioData } from "@/services/portfolioService";
import { getAllInvestorsWithSummary, getActiveAssets } from "@/services/adminDataService";
import { useInvestorSearch } from "./useInvestorSearch";

export const useInvestors = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
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
      
      // Check admin status
      const { isAdmin: adminStatus } = await checkAdminStatus();
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        console.log("User is not an admin, stopping fetch");
        setLoading(false);
        setInvestors([]);
        return;
      }
      
      // Fetch assets using new consolidated service
      const assetsData = await getActiveAssets();
      setAssets(assetsData.map(asset => ({
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        is_active: asset.is_active
      })));
      
      // Fetch investors with summary using new consolidated service
      const investorsWithSummary = await getAllInvestorsWithSummary();
      
       // Convert to expected format
       const investorsList = investorsWithSummary.map(investor => ({
         id: investor.id,
         email: investor.email,
         first_name: investor.first_name,
         last_name: investor.last_name,
         created_at: investor.created_at,
         fee_percentage: 2.0, // Default fee percentage
         portfolio_summary: {} // Empty object to match Investor type
       }));
      
      setInvestors(investorsList);
      console.log("Loaded investors with consolidated service:", investorsList.length);
      
      // Also check for pending invites to include
      try {
        const invitesData = await fetchPendingInvites();
        if (invitesData.length > 0) {
          setInvestors(prevInvestors => [...prevInvestors, ...invitesData]);
        }
      } catch (invitesError) {
        console.error("Error fetching pending invites:", invitesError);
      }
      
    } catch (error) {
      console.error('Error in main investor data fetch:', error);
      toast({
        title: "Error",
        description: "Failed to load investor data",
        variant: "destructive",
      });
      setInvestors([]);
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
