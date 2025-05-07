
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // Initially null until checked
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Use the admin.getUserById function instead of querying profiles directly
      // This avoids the RLS recursion issue
      const { data: adminUserData, error: adminError } = await supabase.auth.admin.getUserById(user.id);
      
      if (adminError) {
        console.error("Error fetching user:", adminError);
        setLoading(false);
        return;
      }
      
      // Check if user is an admin using user metadata
      const isUserAdmin = adminUserData?.user?.app_metadata?.is_admin === true;
      setIsAdmin(isUserAdmin);
      
      if (!isUserAdmin) {
        setLoading(false);
        return;
      }
      
      // Fetch all assets
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('id, symbol, name')
        .order('id');
      
      if (assetError) {
        console.error("Error fetching assets:", assetError);
        toast({
          title: "Error",
          description: "Failed to load asset data",
          variant: "destructive",
        });
      }
      
      setAssets(assetData || []);
      
      // Get all profiles (potentially investors)
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
        setLoading(false);
        return;
      }
      
      // Fetch portfolio data for each investor
      const investorsWithPortfolios = await Promise.all((investorProfiles || []).map(async (investor) => {
        // Get portfolio data
        const { data: portfolioData } = await supabase
          .from('portfolios')
          .select(`
            balance,
            asset_id,
            assets (
              symbol
            )
          `)
          .eq('user_id', investor.id);
          
        // Create portfolio summary by asset
        const portfolioSummary: { [key: string]: { balance: number, usd_value: number } } = {};
        
        if (portfolioData && portfolioData.length > 0) {
          portfolioData.forEach(item => {
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
      
      setInvestors(investorsWithPortfolios);
      setFilteredInvestors(investorsWithPortfolios);
    } catch (error) {
      console.error('Error fetching investor data:', error);
      toast({
        title: "Error",
        description: "Failed to load investor data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Only fetch data once on mount
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
