import { supabase } from "@/integrations/supabase/client";
import { InvestorFormValues } from "@/components/admin/investors/InvestorForm";
import { addCsrfHeader } from "@/lib/security/csrf";
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
      headers: addCsrfHeader({}),
    });

    if (error) {
      console.error("Error creating user via Edge Function:", error);
      let errorMessage = "Failed to create user";
      
      // Extract error message from various sources
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

      // If user already exists, try to find them and return their ID
      if (errorMessage.includes("already") && errorMessage.includes("registered")) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", values.email)
          .maybeSingle();
        
        if (existingProfile?.id) {
          console.log("Found existing user by email, returning their ID:", existingProfile.id);
          return existingProfile.id;
        }
      }
      
      throw new Error(errorMessage);
    }

    // Check for error in successful response (edge function returned 200 but with error)
    if (data?.success === false && data?.error) {
      // Also try to find existing user for this error case
      if (data.error.includes("already") && data.error.includes("registered")) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", values.email)
          .maybeSingle();
        
        if (existingProfile?.id) {
          console.log("Found existing user by email, returning their ID:", existingProfile.id);
          return existingProfile.id;
        }
      }
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

export const deleteInvestorUser = async (userId: string): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke("admin-user-management", {
      body: {
        action: "deleteUser",
        userId,
      },
      headers: addCsrfHeader({}),
    });

    if (error) {
      console.error("Error deleting user via Edge Function:", error);
      let errorMessage = "Failed to delete user";
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

    if (data?.success === false && data?.error) {
      throw new Error(data.error);
    }

  } catch (error) {
    console.error("Error in deleteInvestorUser:", error);
    throw error;
  }
};

export const forceDeleteInvestorUser = async (userId: string): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke("admin-user-management", {
      body: {
        action: "forceDeleteUser",
        userId,
      },
      headers: addCsrfHeader({}),
    });

    if (error) {
      console.error("Error force deleting user via Edge Function:", error);
      let errorMessage = "Failed to force delete user";
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

    if (data?.success === false && data?.error) {
      throw new Error(data.error);
    }

  } catch (error) {
    console.error("Error in forceDeleteInvestorUser:", error);
    throw error;
  }
};
