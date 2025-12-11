import { supabase } from "@/integrations/supabase/client";
import { InvestorFormValues } from "@/components/admin/investors/InvestorForm";
import { User } from "@supabase/supabase-js";

export const createOrFindInvestorUser = async (
  values: InvestorFormValues
): Promise<string | null> => {
  try {
    // Generate a complex password that meets Supabase requirements
    const generateStrongPassword = () => {
      const lowercase = "abcdefghijklmnopqrstuvwxyz";
      const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const numbers = "0123456789";
      const special = "!@#$%^&*()_+-=[]{};'\":|<>?,./`~";

      const getRandomChar = (charset: string) =>
        charset.charAt(Math.floor(Math.random() * charset.length));

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

    // Call Edge Function to create user securely
    const { data, error } = await supabase.functions.invoke("admin-user-management", {
      body: {
        action: "create_user",
        email: values.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: values.first_name,
          last_name: values.last_name,
          is_investor: true,
          is_admin: false,
        },
      },
    });

    if (error) {
      console.error("Error creating user via Edge Function:", error);
      throw new Error(error.message || "Failed to create user");
    }

    if (data?.user?.id) {
      return data.user.id;
    } else if (data?.id) {
      return data.id;
    } else if (data?.error) {
       // Handle "User already exists" gracefully if possible, or throw
       throw new Error(data.error);
    } else {
      throw new Error("User created but no ID returned from Edge Function");
    }

  } catch (error) {
    console.error("Error in createOrFindInvestorUser:", error);
    throw error;
  }
};
