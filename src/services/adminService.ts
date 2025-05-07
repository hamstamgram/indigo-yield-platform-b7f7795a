
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches admin profile data and verifies admin status
 * @returns Admin user data including name and admin status
 */
export const fetchAdminProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { userName: "", isAdmin: false };
  
  // Check if admin email (case insensitive)
  const isKnownAdminEmail = user.email?.toLowerCase() === 'hammadou@indigo.fund';
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, is_admin')
    .eq('id', user.id)
    .single();
    
  if (profile) {
    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`;
    
    // If either the profile indicates admin or it's a known admin email
    if (profile.is_admin || isKnownAdminEmail) {
      return { userName, isAdmin: true };
    }
    
    return { userName, isAdmin: false };
  }
  
  // Fallback to email check if profile not found
  if (isKnownAdminEmail) {
    return { userName: user.email || "", isAdmin: true };
  }
  
  return { userName: "", isAdmin: false };
};
