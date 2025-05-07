
import { supabase } from "@/integrations/supabase/client";
import { InvestorFormValues } from "@/components/admin/investors/InvestorForm";

export const createOrFindInvestorUser = async (values: InvestorFormValues): Promise<string | null> => {
  try {
    // First try to find if user already exists
    const { data: existingUser, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', values.email)
      .single();
    
    // If found, return existing user ID
    if (existingUser && !findError) {
      console.log("Found existing user:", existingUser.id);
      return existingUser.id;
    }

    // Generate a random password for the initial user account
    const tempPassword = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    
    // Create a user in the auth system if doesn't exist
    // Since we can't use admin.createUser with a regular token, let's try using the signup endpoint
    console.log("Attempting to create new user via signup...");
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: values.email,
      password: tempPassword,
      options: {
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          is_investor: true
        }
      }
    });
    
    if (signupError) {
      console.log("Signup error:", signupError);
      
      // Try to fetch the user by email again to see if the user was already created
      const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', values.email)
        .single();
        
      if (profileFetchError || !profileData) {
        console.error("Failed to find or create user:", profileFetchError);
        throw new Error("Failed to find or create user");
      }
      
      return profileData.id;
    } else {
      // New user created successfully
      const userId = authData?.user?.id;
      
      if (!userId) {
        throw new Error("User created but ID not returned");
      }
      
      console.log("New user created with ID:", userId);
      
      // Check if the profile was automatically created
      // Wait a moment to allow the database trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile) {
        console.log("Profile not found after creation, creating manually");
        // Manually create the profile if it wasn't created automatically
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: values.email,
            first_name: values.first_name,
            last_name: values.last_name,
            is_admin: false
          });
        
        if (insertError) {
          console.error("Error creating profile:", insertError);
          throw new Error("Failed to create user profile");
        }
      } else {
        console.log("Profile was created automatically:", profile);
      }
      
      return userId;
    }
  } catch (error) {
    console.error("Error creating/finding investor user:", error);
    return null;
  }
};
