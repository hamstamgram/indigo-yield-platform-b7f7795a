
import { supabase } from "@/integrations/supabase/client";
import { InvestorFormValues } from "@/components/admin/investors/InvestorForm";

export const createOrFindInvestorUser = async (values: InvestorFormValues): Promise<string | null> => {
  try {
    // Generate a random password for the initial user account
    const tempPassword = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
    
    // 1. Create a user in the auth system
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: values.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: values.first_name,
        last_name: values.last_name,
        is_investor: true
      }
    });
    
    if (authError) {
      // If the user already exists in auth system, continue with the profile creation
      console.log("Auth creation warning (user may already exist):", authError);
      
      // Try to fetch the user by email to get their ID
      const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', values.email)
        .single();
        
      if (profileFetchError || !profileData) {
        throw new Error("Failed to find or create user");
      }
      
      return profileData.id;
    } else {
      return authData?.user?.id || null;
    }
  } catch (error) {
    console.error("Error creating/finding investor user:", error);
    return null;
  }
};
