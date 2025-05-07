
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
    // Instead of using auth.admin API which requires special permissions,
    // fetch profiles from the profiles table directly
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, created_at')
      .eq('is_admin', false);
      
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return [];
    }
    
    console.log("Found profiles:", profilesData?.length || 0);
    
    // Map to our investor format
    const mappedInvestors = profilesData.map(profile => {
      return {
        id: profile.id || '',
        email: profile.email || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        created_at: profile.created_at || '',
        portfolio_summary: {}
      } as Investor;
    });
    
    return mappedInvestors;
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
    const { data: invitesData, error: invitesError } = await supabase
      .from('admin_invites')
      .select('email, created_at')
      .eq('used', false);
    
    if (invitesError) throw invitesError;
    
    console.log("Found invites:", invitesData?.length || 0);
    
    if (invitesData && invitesData.length > 0) {
      return invitesData.map(invite => ({
        id: '',
        email: invite.email,
        first_name: '',
        last_name: '',
        created_at: invite.created_at,
        portfolio_summary: {}
      })) as Investor[];
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching invites:", error);
    return [];
  }
};
