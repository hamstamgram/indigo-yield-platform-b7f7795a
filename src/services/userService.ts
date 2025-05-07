
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
      .maybeSingle();
    
    // If found, return existing user ID
    if (existingUser && !findError) {
      console.log("Found existing user:", existingUser.id);
      return existingUser.id;
    }
    
    console.log("No existing user found, will create new user...");

    // Generate a complex password that meets Supabase requirements
    const generateStrongPassword = () => {
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const special = '!@#$%^&*()_+-=[]{};\'":|<>?,./`~';
      
      const getRandomChar = (charset: string) => charset.charAt(Math.floor(Math.random() * charset.length));
      
      // Ensure at least one of each required character type
      let password = 
        getRandomChar(lowercase) +
        getRandomChar(uppercase) +
        getRandomChar(numbers) +
        getRandomChar(special);
      
      // Add additional random characters
      for (let i = 0; i < 12; i++) {
        const allChars = lowercase + uppercase + numbers + special;
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
      }
      
      return password;
    };
    
    const tempPassword = generateStrongPassword();
    console.log(`Attempting to create new user for ${values.email} with a complex password...`);
    
    // Create the user using admin create user
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: values.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: values.first_name,
        last_name: values.last_name,
        is_investor: true,
        is_admin: false
      }
    });
    
    if (createError) {
      console.error("Admin signup error:", createError);
      
      // Fall back to regular signup if admin fails
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: values.email,
        password: tempPassword,
        options: {
          data: {
            first_name: values.first_name,
            last_name: values.last_name,
            is_investor: true,
            is_admin: false
          }
        }
      });
      
      if (signupError) {
        console.error("Signup error:", signupError);
        throw new Error(`Signup failed: ${signupError.message}`);
      }
      
      const userId = authData?.user?.id;
      
      if (!userId) {
        console.error("User created but ID not returned");
        throw new Error("User created but ID not returned");
      }
      
      console.log("New user created with ID:", userId);
      return userId;
    }
    
    const userId = userData?.user.id;
    
    if (!userId) {
      console.error("Admin user created but ID not returned");
      throw new Error("User created but ID not returned");
    }
    
    console.log("New user created with ID:", userId);
    return userId;
    
  } catch (error) {
    console.error("Error in createOrFindInvestorUser:", error);
    throw error; // Re-throw to be handled by the caller
  }
};
