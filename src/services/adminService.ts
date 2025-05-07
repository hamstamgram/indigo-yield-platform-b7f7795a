
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches admin profile data and verifies admin status
 * @returns Admin user data including name and admin status
 */
export const fetchAdminProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { userName: "", isAdmin: false };
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, is_admin')
    .eq('id', user.id)
    .single();
    
  if (profile) {
    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`;
    
    // Ensure this is an admin
    if (!profile.is_admin) {
      console.error("Non-admin user accessing admin dashboard");
      return { userName, isAdmin: false };
    }
    
    return { userName, isAdmin: true };
  }
  
  return { userName: "", isAdmin: false };
};
