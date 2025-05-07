
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
      
      try {
        // Use function call that's already working
        const { data: adminResult, error: adminError } = await supabase
          .rpc('get_user_admin_status', { user_id: user.id });
          
        if (adminError) {
          throw adminError;
        }
        
        console.log("Admin check result via function:", adminResult);
        setIsAdmin(adminResult);
        
        if (!adminResult) {
          console.log("User is not an admin, stopping fetch");
          setLoading(false);
          setInvestors([]);
          setFilteredInvestors([]);
          return;
        }
      } catch (adminError) {
        console.error("Error checking admin status:", adminError);
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
      
      // Use auth.users() API instead of profiles table directly
      try {
        // Fetch users from auth.users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error fetching users:", authError);
          throw authError;
        }
        
        console.log("Fetched auth users:", authUsers?.users?.length || 0);
        
        // Filter non-admin users (based on metadata)
        const nonAdminUsers = authUsers?.users?.filter(user => 
          !user.user_metadata?.is_admin && 
          user.user_metadata?.is_investor
        ) || [];
        
        // Prepare investor objects from auth users
        const investorsList: Investor[] = nonAdminUsers.map(user => ({
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          created_at: user.created_at || '',
          portfolio_summary: {}
        }));
        
        console.log("Found investors:", investorsList.length);
        
        // Fetch portfolio data for each investor
        const investorsWithPortfolios = await Promise.all(investorsList.map(async (investor) => {
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
      } catch (usersError) {
        console.error("Error fetching users:", usersError);
        
        // Fallback approach - try to get users from sign-ups directly
        try {
          // Find all users who have been created
          const { data: invitesData, error: invitesError } = await supabase
            .from('admin_invites')
            .select('email, created_at');
          
          if (invitesError) throw invitesError;
          
          console.log("Found invites:", invitesData?.length || 0);
          
          // Create simple investor objects from invites
          const simpleInvestorsList = invitesData?.map(invite => ({
            id: '', // We don't have the ID from invites
            email: invite.email,
            first_name: null,
            last_name: null,
            created_at: invite.created_at,
            portfolio_summary: {}
          })) || [];
          
          setInvestors(simpleInvestorsList);
          setFilteredInvestors(simpleInvestorsList);
        } catch (fallbackError) {
          console.error("Error with fallback approach:", fallbackError);
          toast({
            title: "Error",
            description: "Failed to load investor data",
            variant: "destructive",
          });
          setInvestors([]);
          setFilteredInvestors([]);
        }
      }
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
        (investor.first_name && investor.first_name.toLowerCase().includes(term)) ||
        (investor.last_name && investor.last_name.toLowerCase().includes(term))
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
