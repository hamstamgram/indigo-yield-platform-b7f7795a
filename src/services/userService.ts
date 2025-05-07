
import { supabase } from "@/integrations/supabase/client";
import { InvestorFormValues } from "@/components/admin/investors/InvestorForm";

export const createOrFindInvestorUser = async (values: InvestorFormValues): Promise<string | null> => {
  try {
    console.log("Starting createOrFindInvestorUser with values:", values);
    
    // First try to find if user already exists
    const { data: existingUser, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', values.email)
      .maybeSingle(); // Changed from single to maybeSingle to prevent errors when no results found
    
    // If found, return existing user ID
    if (existingUser && !findError) {
      console.log("Found existing user:", existingUser.id);
      return existingUser.id;
    }
    
    console.log("No existing user found, will create new user...");

    // Generate a complex password that meets Supabase requirements
    // Must include lowercase, uppercase, number, and special character
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{};\'":|<>?,./`~';
    
    const getRandomChar = (charset: string) => charset.charAt(Math.floor(Math.random() * charset.length));
    
    // Ensure at least one of each required character type
    const tempPassword = 
      getRandomChar(lowercase) +
      getRandomChar(uppercase) +
      getRandomChar(numbers) +
      getRandomChar(special) +
      Array(8).fill(0).map(() => {
        const allChars = lowercase + uppercase + numbers + special;
        return allChars.charAt(Math.floor(Math.random() * allChars.length));
      }).join('');
    
    console.log(`Attempting to create new user for ${values.email} with a complex password...`);
    
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
    
    console.log("Signup response:", authData ? "Success" : "Failed", signupError ? `Error: ${signupError.message}` : "No errors");
    
    if (signupError) {
      console.log("Signup error:", signupError);
      
      // Try to fetch the user by email again to see if the user was already created
      const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', values.email)
        .maybeSingle();
        
      if (profileFetchError) {
        console.error("Failed to find user after signup error:", profileFetchError);
        throw new Error("Failed to find or create user");
      }
      
      if (profileData) {
        console.log("Found existing profile despite signup error:", profileData.id);
        return profileData.id;
      } else {
        console.error("User not found and could not be created");
        throw new Error("User not found and could not be created");
      }
    }
    
    // New user created successfully
    const userId = authData?.user?.id;
    
    if (!userId) {
      console.error("User created but ID not returned");
      throw new Error("User created but ID not returned");
    }
    
    console.log("New user created with ID:", userId);
    
    // Check if the profile was automatically created
    // Wait a moment to allow the database trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify the profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error("Error checking profile:", profileError);
    }
    
    if (!profile) {
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
  } catch (error) {
    console.error("Error in createOrFindInvestorUser:", error);
    return null;
  }
};
