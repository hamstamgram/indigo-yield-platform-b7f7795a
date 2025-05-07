
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Investor, Asset } from "@/types/investorTypes";

export const useInvestors = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<Investor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(false);
  const { toast } = useToast();

  // Define fetchData outside of useEffect to use with refetch
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching investor data...");
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("No user found, stopping fetch");
        setLoading(false);
        return;
      }
      
      console.log("Checking admin status for user:", user.id);
      
      // Check admin status - direct query from profiles
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          throw profileError;
        }
        
        const isUserAdmin = profileData?.is_admin === true;
        console.log("Admin status determined from profiles:", isUserAdmin);
        setIsAdmin(isUserAdmin);
        
        if (!isUserAdmin) {
          console.log("User is not an admin, stopping fetch");
          setLoading(false);
          setInvestors([]);
          setFilteredInvestors([]);
          return;
        }
      } catch (profileError) {
        console.error("Error checking admin status from profiles:", profileError);
        setIsAdmin(false);
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to verify admin status",
          variant: "destructive",
        });
        return;
      }
      
      // Continue with fetching assets data
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('id, symbol, name')
        .order('symbol');
      
      if (assetError) {
        console.error("Error fetching assets:", assetError);
        toast({
          title: "Error",
          description: "Failed to load asset data",
          variant: "destructive",
        });
        setAssets([]);
      } else {
        console.log("Fetched assets:", assetData?.length || 0);
        setAssets(assetData || []);
      }
      
      // Get all investor profiles directly without filters to avoid RLS issues
      console.log("Fetching all profiles without filtering for is_admin");
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at, is_admin');
      
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        toast({
          title: "Error",
          description: "Failed to load investor data",
          variant: "destructive",
        });
        setInvestors([]);
        setFilteredInvestors([]);
        setLoading(false);
        return;
      }

      // Filter to get non-admin users
      const investorProfiles = allProfiles?.filter(profile => !profile.is_admin) || [];
      console.log("Filtered investor profiles:", investorProfiles.length);
      
      if (!investorProfiles || investorProfiles.length === 0) {
        console.log("No investors found");
        setInvestors([]);
        setFilteredInvestors([]);
        setLoading(false);
        return;
      }
      
      // Fetch portfolio data for each investor
      const investorsWithPortfolios = await Promise.all(investorProfiles.map(async (investor) => {
        // Get portfolio data
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('portfolios')
          .select(`
            balance,
            asset_id,
            assets (
              symbol
            )
          `)
          .eq('user_id', investor.id);
          
        if (portfolioError) {
          console.error(`Error fetching portfolio for user ${investor.id}:`, portfolioError);
        }
        
        // Create portfolio summary by asset
        const portfolioSummary: { [key: string]: { balance: number, usd_value: number } } = {};
        
        if (portfolioData && portfolioData.length > 0) {
          portfolioData.forEach(item => {
            if (!item.assets) return;
            const symbol = item.assets.symbol;
            const balance = Number(item.balance);
            
            // Mock price calculation (in production, fetch real prices)
            const price = symbol === 'BTC' ? 67500 : 
                        symbol === 'ETH' ? 3200 : 
                        symbol === 'SOL' ? 148 : 
                        symbol === 'USDC' ? 1 : 0;
            
            portfolioSummary[symbol] = {
              balance,
              usd_value: balance * price
            };
          });
        }
        
        return {
          ...investor,
          portfolio_summary: portfolioSummary
        };
      }));
      
      console.log("Processed investors with portfolios:", investorsWithPortfolios.length);
      setInvestors(investorsWithPortfolios);
      setFilteredInvestors(investorsWithPortfolios);
    } catch (error) {
      console.error('Error fetching investor data:', error);
      toast({
        title: "Error",
        description: "Failed to load investor data",
        variant: "destructive",
      });
      setInvestors([]);
      setFilteredInvestors([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredInvestors(investors);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = investors.filter(investor => 
        investor.email?.toLowerCase().includes(term) || 
        investor.first_name?.toLowerCase().includes(term) ||
        investor.last_name?.toLowerCase().includes(term)
      );
      setFilteredInvestors(filtered);
    }
  }, [searchTerm, investors]);
  
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
