
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches admin profile data and verifies admin status
 * @returns Admin user data including name and admin status
 */
export const fetchAdminProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { userName: "", isAdmin: false };
  
  console.log("Checking admin status for user:", user.id);
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, is_admin')
    .eq('id', user.id)
    .single();
    
  console.log("Profile data retrieved:", profile);
  
  if (profile) {
    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`;
    
    // Explicitly check for true value
    if (profile.is_admin === true) {
      console.log("User is confirmed admin via profile");
      return { userName, isAdmin: true };
    }
    
    return { userName, isAdmin: false };
  }
  
  return { userName: "", isAdmin: false };
};
