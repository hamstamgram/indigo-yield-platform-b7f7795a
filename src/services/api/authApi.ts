import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface PasswordResetData {
  email: string;
}

/**
 * Sign in user with email and password
 */
export async function signIn({ email, password }: LoginCredentials): Promise<AuthUser> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error("No user data returned");
    }

    // Fetch user profile
    const profile = await fetchUserProfile(data.user.id);

    return {
      id: data.user.id,
      email: data.user.email || "",
      profile,
    };
  } catch (error) {
    console.error("Error signing in:", error);
    throw new Error("Authentication failed");
  }
}

/**
 * Sign up new user
 */
export async function signUp({ email, password, firstName, lastName }: SignUpData): Promise<void> {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error signing up:", error);
    throw new Error("Sign up failed");
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Error signing out:", error);
    throw new Error("Sign out failed");
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset({ email }: PasswordResetData): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error sending password reset:", error);
    throw new Error("Failed to send password reset email");
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error updating password:", error);
    throw new Error("Failed to update password");
  }
}

/**
 * Fetch user profile by ID
 */
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as Profile | null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<Profile, "id" | "created_at">>
): Promise<Profile> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Profile not found");
    return data as Profile;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw new Error("Failed to update profile");
  }
}

/**
 * Check if user is admin
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error("Error getting current session:", error);
    return null;
  }
}

/**
 * Error handling wrapper for auth API calls
 */
export function withAuthErrorHandling<T extends any[], R>(fn: (...args: T) => Promise<R>) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error("Auth API Error:", error);
      throw error;
    }
  };
}

// Export wrapped functions for additional error handling
export const safeSignIn = withAuthErrorHandling(signIn);
export const safeSignUp = withAuthErrorHandling(signUp);
export const safeSignOut = withAuthErrorHandling(signOut);
export const safeSendPasswordReset = withAuthErrorHandling(sendPasswordReset);
export const safeUpdatePassword = withAuthErrorHandling(updatePassword);
