import { supabase } from "@/integrations/supabase/client";
import { InvestorFormValues } from "@/features/admin/investors/components/forms/InvestorForm";
import { addCsrfHeader } from "@/lib/security/csrf";
import { logError } from "@/lib/logger";

/**
 * Helper to verify session and throw a user-friendly error if expired
 */
async function requireSession(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Your session has expired. Please log in again to continue.");
  }
}

export const createOrFindInvestorUser = async (
  values: InvestorFormValues
): Promise<string | null> => {
  try {
    // Verify session before making the call
    await requireSession();
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
      logError("userService.createOrFindInvestorUser", error);
      let errorMessage = "Failed to create user";

      // Extract error message from various sources
      try {
        if (error.context && typeof error.context.json === "function") {
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
    logError("userService.createOrFindInvestorUser", error);
    throw error;
  }
};

export const deleteInvestorUser = async (userId: string): Promise<void> => {
  try {
    // Verify session before making the call
    await requireSession();

    const { data, error } = await supabase.functions.invoke("admin-user-management", {
      body: {
        action: "deleteUser",
        userId,
      },
      headers: addCsrfHeader({}),
    });

    if (error) {
      logError("userService.deleteInvestorUser", error);

      // Handle network/connection errors
      if (error.message?.includes("Failed to send") || error.message?.includes("fetch")) {
        throw new Error(
          "Unable to connect to the server. Please check your internet connection and try again."
        );
      }

      let errorMessage = "Failed to delete user";
      try {
        if (error.context && typeof error.context.json === "function") {
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
    logError("userService.deleteInvestorUser", error);
    throw error;
  }
};

export const forceDeleteInvestorUser = async (userId: string): Promise<void> => {
  try {
    // Verify session before making the call
    await requireSession();

    const { data, error } = await supabase.functions.invoke("admin-user-management", {
      body: {
        action: "forceDeleteUser",
        userId,
      },
      headers: addCsrfHeader({}),
    });

    if (error) {
      logError("userService.forceDeleteInvestorUser", error);

      // Handle network/connection errors
      if (error.message?.includes("Failed to send") || error.message?.includes("fetch")) {
        throw new Error(
          "Unable to connect to the server. Please check your internet connection and try again."
        );
      }

      let errorMessage = "Failed to force delete user";
      try {
        if (error.context && typeof error.context.json === "function") {
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
    logError("userService.forceDeleteInvestorUser", error);
    throw error;
  }
};
