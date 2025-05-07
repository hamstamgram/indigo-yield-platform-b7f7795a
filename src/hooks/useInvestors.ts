
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
      
      // Use the get_profile_by_id function to safely check admin status
      // This avoids RLS recursion issues
      try {
        const { data: profileData, error: profileError } = await supabase
          .rpc('get_profile_by_id', { profile_id: user.id });
          
        if (profileError) {
          throw profileError;
        }
        
        const isUserAdmin = profileData && profileData.length > 0 ? profileData[0]?.is_admin === true : false;
        console.log("Admin status determined via function:", isUserAdmin);
        setIsAdmin(isUserAdmin);
        
        if (!isUserAdmin) {
          console.log("User is not an admin, stopping fetch");
          setLoading(false);
          setInvestors([]);
          setFilteredInvestors([]);
          return;
        }
      } catch (profileError) {
        console.error("Error checking admin status via function:", profileError);
        
        // Direct admin check as fallback
        try {
          // Fallback to direct query
          const { data: profileData, error: directError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
            
          if (directError) {
            throw directError;
          }
          
          const isUserAdmin = profileData?.is_admin === true;
          console.log("Admin status determined via direct query:", isUserAdmin);
          setIsAdmin(isUserAdmin);
          
          if (!isUserAdmin) {
            console.log("User is not an admin, stopping fetch");
            setLoading(false);
            setInvestors([]);
            setFilteredInvestors([]);
            return;
          }
        } catch (directError) {
          console.error("Error checking admin status directly:", directError);
          setIsAdmin(false);
          setLoading(false);
          toast({
            title: "Error",
            description: "Failed to verify admin status",
            variant: "destructive",
          });
          return;
        }
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
      
      try {
        // Try to fetch admin invites first as a fallback
        const { data: invitesData, error: invitesError } = await supabase
          .from('admin_invites')
          .select('email, created_at')
          .eq('used', false);
        
        if (invitesError) throw invitesError;
        
        console.log("Found invites:", invitesData?.length || 0);
        
        // Get all profiles using the RPC function to bypass RLS
        const { data: allProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, created_at, is_admin')
          .eq('is_admin', false);
        
        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          
          // If no profile data, use invites as fallback
          if (invitesData && invitesData.length > 0) {
            const simpleInvestorsList = invitesData?.map(invite => ({
              id: '',
              email: invite.email,
              first_name: '',
              last_name: '',
              created_at: invite.created_at,
              portfolio_summary: {}
            })) as Investor[];
            
            setInvestors(simpleInvestorsList);
            setFilteredInvestors(simpleInvestorsList);
            setLoading(false);
            return;
          } else {
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
        }

        console.log("Found investor profiles:", allProfiles?.length || 0);
        
        if (!allProfiles || allProfiles.length === 0) {
          console.log("No investors found");
          setInvestors([]);
          setFilteredInvestors([]);
          setLoading(false);
          return;
        }
        
        // Fetch portfolio data for each investor
        const investorsWithPortfolios = await Promise.all(allProfiles.map(async (investor) => {
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
      }
    } catch (error) {
      console.error('Error in main investor data fetch:', error);
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
