
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches admin profile data and verifies admin status
 * @returns Admin user data including name and admin status
 */
export const fetchAdminProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { userName: "", isAdmin: false };
    
    console.log("Checking admin status for user:", user.id);
    
    // Use the get_profile_by_id function to avoid RLS recursion issues
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_profile_by_id', { profile_id: user.id });
      
    if (functionError) {
      console.error("Error fetching profile via function:", functionError);
      
      // Fallback to direct query if function fails
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, is_admin')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error("Error fetching profile via direct query:", error);
        return { userName: "", isAdmin: false };
      }
      
      console.log("Profile data retrieved via direct query:", profile);
      
      if (profile) {
        const userName = `${profile.first_name || ''} ${profile.last_name || ''}`;
        return { userName, isAdmin: profile.is_admin === true };
      }
      
      return { userName: "", isAdmin: false };
    }
    
    console.log("Profile data retrieved via function:", functionData);
    
    if (functionData && functionData.length > 0) {
      const profile = functionData[0];
      const userName = `${profile.first_name || ''} ${profile.last_name || ''}`;
      return { userName, isAdmin: profile.is_admin === true };
    }
    
    return { userName: "", isAdmin: false };
  } catch (error) {
    console.error("Error in fetchAdminProfile:", error);
    return { userName: "", isAdmin: false };
  }
};
