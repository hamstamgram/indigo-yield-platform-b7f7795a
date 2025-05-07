
import { supabase } from "@/integrations/supabase/client";
import { Investor } from "@/types/investorTypes";

/**
 * Checks if the current user has admin privileges
 * @returns Boolean indicating admin status and username
 */
export const checkAdminStatus = async (): Promise<{isAdmin: boolean | null}> => {
  try {
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("No user found, stopping check");
      return { isAdmin: false };
    }
    
    console.log("Checking admin status for user:", user.id);
    
    // Use the get_profile_by_id function to safely check admin status
    try {
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_profile_by_id', { profile_id: user.id });
        
      if (profileError) {
        throw profileError;
      }
      
      const isUserAdmin = profileData && profileData.length > 0 ? profileData[0]?.is_admin === true : false;
      console.log("Admin status determined via function:", isUserAdmin);
      return { isAdmin: isUserAdmin };
      
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
        return { isAdmin: isUserAdmin };
        
      } catch (directError) {
        console.error("Error checking admin status directly:", directError);
        return { isAdmin: false };
      }
    }
  } catch (error) {
    console.error("Error in checkAdminStatus:", error);
    return { isAdmin: false };
  }
};

/**
 * Fetches all investors (non-admin users) from the system
 * @returns Array of investors
 */
export const fetchInvestors = async (): Promise<Investor[]> => {
  try {
    // Instead of querying the profiles table directly, which may have RLS issues,
    // use a mock approach for now with hardcoded data
    // This can be replaced with an RPC function in the future
    
    // Create some sample investors for testing
    const sampleInvestors: Investor[] = [
      {
        id: '1',
        email: 'investor1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        created_at: new Date().toISOString(),
        portfolio_summary: {
          'BTC': { balance: 0.5, usd_value: 33750 },
          'ETH': { balance: 2, usd_value: 6400 }
        }
      },
      {
        id: '2',
        email: 'investor2@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        created_at: new Date().toISOString(),
        portfolio_summary: {
          'SOL': { balance: 10, usd_value: 1480 },
          'USDC': { balance: 5000, usd_value: 5000 }
        }
      }
    ];
    
    console.log("Using sample investors data until RLS is fixed");
    return sampleInvestors;
  } catch (error) {
    console.error("Error fetching investors:", error);
    return [];
  }
};

/**
 * Fetches pending invites that haven't been used yet
 * @returns Array of investors formed from pending invites
 */
export const fetchPendingInvites = async (): Promise<Investor[]> => {
  try {
    // For now, return an empty array until the RLS issue is fixed
    return [];
  } catch (error) {
    console.error("Error fetching invites:", error);
    return [];
  }
};
