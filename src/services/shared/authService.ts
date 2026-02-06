/**
 * Auth Service
 * Encapsulates authentication-related operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface CurrentUser {
  id: string;
  email?: string;
}

/**
 * Get the currently authenticated user
 * Throws if not authenticated
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) throw error;
  if (!user?.id) throw new Error("Authentication required");
  
  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Get the currently authenticated user, returning null if not authenticated
 */
export async function getCurrentUserOptional(): Promise<CurrentUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user?.id) return null;
  
  return {
    id: user.id,
    email: user.email,
  };
}

// Class wrapper for consistency
class AuthServiceClass {
  getCurrentUser = getCurrentUser;
  getCurrentUserOptional = getCurrentUserOptional;
}

export const authService = new AuthServiceClass();
