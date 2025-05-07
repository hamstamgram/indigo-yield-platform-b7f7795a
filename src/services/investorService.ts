
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
    // Use auth admin API to fetch users directly
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching users:", authError);
      throw authError;
    }
    
    // Filter to only get non-admin users based on metadata
    const nonAdminUsers = authUsers?.users?.filter(user => {
      if (!user) return false;
      
      // Explicitly cast the user to avoid type issues
      const userMeta = (user as any).user_metadata;
      return userMeta && userMeta.is_admin !== true;
    }) || [];
    
    console.log("Found users via auth API:", nonAdminUsers?.length || 0);
    
    // Map them to our investor format
    const mappedInvestors = nonAdminUsers.map(user => {
      if (!user) {
        return {
          id: '',
          email: '',
          first_name: '',
          last_name: '',
          created_at: '',
          portfolio_summary: {}
        } as Investor;
      }
      
      // Explicitly cast to avoid type issues
      const typedUser = user as any;
      const userMetadata = typedUser.user_metadata as Record<string, unknown> | null | undefined;
      
      return {
        id: typedUser.id || '',
        email: typedUser.email || '',
        first_name: userMetadata?.first_name as string || '',
        last_name: userMetadata?.last_name as string || '',
        created_at: typedUser.created_at || '',
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
