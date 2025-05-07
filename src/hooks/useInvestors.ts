
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(false); // Initialize as false
  const { toast } = useToast();

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
      
      // Check admin status
      const { data: adminStatus, error: adminError } = await supabase
        .rpc('get_user_admin_status', { user_id: user.id });
      
      if (adminError) {
        console.error("Error checking admin status via function:", adminError);
        // Fall back to direct query if RPC fails
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profileError) {
          console.error("Error checking admin status:", profileError);
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        
        setIsAdmin(profileData?.is_admin === true);
        console.log("Admin status determined:", profileData?.is_admin);
      } else {
        setIsAdmin(adminStatus === true);
        console.log("Admin check result via function:", adminStatus);
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
      
      // Get all investor profiles (non-admin users)
      const { data: investorProfiles, error: userError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at, is_admin')
        .eq('is_admin', false)
        .order('created_at', { ascending: false });
      
      if (userError) {
        console.error("Error fetching users:", userError);
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

      console.log("Fetched investor profiles:", investorProfiles?.length || 0);
      
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
