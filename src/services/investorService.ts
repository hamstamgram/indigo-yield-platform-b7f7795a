import { supabase } from "@/integrations/supabase/client";

// Legacy investor type from investorTypes
interface LegacyInvestor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  fee_percentage?: number;
  portfolio_summary?: Record<string, { balance: number; usd_value: number }>;
}

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
 * @returns Array of legacy investors
 */
export const fetchInvestors = async (): Promise<LegacyInvestor[]> => {
  try {
    // Try to use our new security definer function to avoid RLS issues
    const { data: profilesData, error: functionError } = await supabase
      .rpc('get_all_non_admin_profiles');
    
    if (functionError) {
      console.error("Error fetching profiles via function:", functionError);
      
      // Fall back to direct query if function fails
      const { data: directData, error: directError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at, fee_percentage')
        .eq('is_admin', false);
      
      if (directError) {
        console.error("Error fetching profiles directly:", directError);
        
        // If both approaches fail, use sample data as a last resort
        console.log("Using sample investors data as fallback");
        return getSampleInvestors();
      }
      
      console.log("Found profiles via direct query:", directData?.length || 0);
      return mapProfilesToInvestors(directData || []);
    }
    
    console.log("Found profiles via function:", profilesData?.length || 0);
    return mapProfilesToInvestors(profilesData || []);
    
  } catch (error) {
    console.error("Error fetching investors:", error);
    return getSampleInvestors();
  }
};

/**
 * Helper function to map profiles data to investors format
 */
const mapProfilesToInvestors = (profiles: any[]): LegacyInvestor[] => {
  if (!profiles || profiles.length === 0) return [];
  
  return profiles.map(profile => ({
    id: profile.id || '',
    email: profile.email || '',
    first_name: profile.first_name || null,
    last_name: profile.last_name || null,
    created_at: profile.created_at || new Date().toISOString(),
    fee_percentage: profile.fee_percentage || 2.0,
    portfolio_summary: {}
  }));
};

/**
 * Returns sample investors as a fallback when database queries fail
 */
const getSampleInvestors = (): LegacyInvestor[] => {
  console.log("Using sample investors data as fallback");
  return [
    {
      id: '1',
      email: 'investor1@example.com',
      first_name: 'John',
      last_name: 'Doe',
      fee_percentage: 2.0,
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
      fee_percentage: 1.5,
      created_at: new Date().toISOString(),
      portfolio_summary: {
        'SOL': { balance: 10, usd_value: 1480 },
        'USDC': { balance: 5000, usd_value: 5000 }
      }
    }
  ];
};

/**
 * Fetches pending invites that haven't been used yet
 * @returns Array of legacy investors formed from pending invites
 */
export const fetchPendingInvites = async (): Promise<LegacyInvestor[]> => {
  try {
    const { data: invitesData, error: invitesError } = await supabase
      .from('admin_invites')
      .select('email, created_at')
      .eq('used', false);
    
    if (invitesError) {
      console.error("Error fetching invites:", invitesError);
      return [];
    }
    
    console.log("Found invites:", invitesData?.length || 0);
    
    if (invitesData && invitesData.length > 0) {
      return invitesData.map(invite => ({
        id: '',
        email: invite.email,
        first_name: null,
        last_name: null,
        created_at: invite.created_at || new Date().toISOString(),
        portfolio_summary: {}
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching invites:", error);
    return [];
  }
};
