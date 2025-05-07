
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
      try {
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
      } catch (error) {
        console.error("Error fetching assets:", error);
        setAssets([]);
      }
      
      try {
        // Use auth admin API to fetch users directly
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error fetching users:", authError);
          throw authError;
        }
        
        // Filter to only get non-admin users based on metadata
        const nonAdminUsers = authUsers?.users.filter(user => {
          return !user.user_metadata?.is_admin;
        }) || [];
        
        console.log("Found users via auth API:", nonAdminUsers?.length || 0);
        
        // Map them to our investor format
        const mappedInvestors = nonAdminUsers.map(user => {
          return {
            id: user.id || '',
            email: user.email || '',
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            created_at: user.created_at || '',
            portfolio_summary: {}
          } as Investor;
        });
        
        // If we don't get users from auth API, try to get admin_invites as fallback
        if (mappedInvestors.length === 0) {
          try {
            const { data: invitesData, error: invitesError } = await supabase
              .from('admin_invites')
              .select('email, created_at')
              .eq('used', false);
            
            if (invitesError) throw invitesError;
            
            console.log("Found invites:", invitesData?.length || 0);
            
            if (invitesData && invitesData.length > 0) {
              const simpleInvestorsList = invitesData.map(invite => ({
                id: '',
                email: invite.email,
                first_name: '',
                last_name: '',
                created_at: invite.created_at,
                portfolio_summary: {}
              })) as Investor[];
              
              setInvestors(simpleInvestorsList);
              setFilteredInvestors(simpleInvestorsList);
            } else {
              setInvestors([]);
              setFilteredInvestors([]);
            }
          } catch (invitesError) {
            console.error("Error fetching invites:", invitesError);
            setInvestors([]);
            setFilteredInvestors([]);
          }
        } else {
          // Enrich with portfolio data if possible
          const investorsWithPortfolios = await Promise.all(mappedInvestors.map(async (investor) => {
            if (!investor.id) return investor;
            
            // Try to get portfolio data
            try {
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
                return investor;
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
            } catch (error) {
              console.error(`Error enriching portfolio for ${investor.id}:`, error);
              return investor;
            }
          }));
          
          setInvestors(investorsWithPortfolios);
          setFilteredInvestors(investorsWithPortfolios);
        }
        
      } catch (error) {
        console.error("Error fetching users:", error);
        
        // Try to get admin_invites as fallback
        try {
          const { data: invitesData, error: invitesError } = await supabase
            .from('admin_invites')
            .select('email, created_at')
            .eq('used', false);
          
          if (invitesError) throw invitesError;
          
          console.log("Found invites:", invitesData?.length || 0);
          
          if (invitesData && invitesData.length > 0) {
            const simpleInvestorsList = invitesData.map(invite => ({
              id: '',
              email: invite.email,
              first_name: '',
              last_name: '',
              created_at: invite.created_at,
              portfolio_summary: {}
            })) as Investor[];
            
            setInvestors(simpleInvestorsList);
            setFilteredInvestors(simpleInvestorsList);
          } else {
            setInvestors([]);
            setFilteredInvestors([]);
          }
        } catch (invitesError) {
          console.error("Error fetching invites:", invitesError);
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
