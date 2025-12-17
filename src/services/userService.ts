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
        action: "createUser",
        email: values.email,
        firstName: values.first_name,
        lastName: values.last_name,
        phone: "",
        role: "LP",
        selectedFunds: [],
        sendWelcomeEmail: true,
      },
    });

    if (error) {
      console.error("Error creating user via Edge Function:", error);
      // Try to extract error message from FunctionsHttpError context
      let errorMessage = "Failed to create user";
      try {
        if (error.context && typeof error.context.json === 'function') {
          const errorBody = await error.context.json();
          errorMessage = errorBody?.error || errorMessage;
        } else {
          errorMessage = error.message || errorMessage;
        }
      } catch {
        errorMessage = error.message || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Check for error in successful response (edge function returned 200 but with error)
    if (data?.success === false && data?.error) {
      throw new Error(data.error);
    }

    if (data?.user?.id) {
      return data.user.id;
    } else if (data?.user_id) {
      return data.user_id;
    } else if (data?.id) {
      return data.id;
    } else {
      throw new Error("User created but no ID returned from Edge Function");
    }

  } catch (error) {
    console.error("Error in createOrFindInvestorUser:", error);
    throw error;
  }
};
