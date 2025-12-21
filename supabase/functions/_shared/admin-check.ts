import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AdminCheckResult {
  isAdmin: boolean;
  email?: string;
  userId?: string;
  error?: string;
}

/**
 * Check if the authenticated user is an admin using profiles.is_admin
 * 
 * This is the canonical admin check for all edge functions.
 * Uses profiles.is_admin for consistency - works correctly for users with multiple roles.
 * 
 * IMPORTANT: Must be called with a service role client to bypass RLS.
 * 
 * @param supabase - Service role Supabase client
 * @param userId - The user ID to check
 * @returns AdminCheckResult with isAdmin status and user info
 */
export async function checkAdminAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminCheckResult> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_admin, email")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Admin check query error:", error.message);
      return { 
        isAdmin: false, 
        userId,
        error: error.message 
      };
    }

    if (!profile) {
      return { 
        isAdmin: false, 
        userId,
        error: "Profile not found" 
      };
    }

    return {
      isAdmin: profile.is_admin === true,
      email: profile.email,
      userId,
    };
  } catch (err: any) {
    console.error("Admin check exception:", err);
    return { 
      isAdmin: false, 
      userId,
      error: err.message || "Unknown error" 
    };
  }
}

/**
 * Create a standardized 403 response for non-admin access attempts
 */
export function createAdminDeniedResponse(
  corsHeaders: Record<string, string>,
  details?: string
): Response {
  return new Response(
    JSON.stringify({ 
      error: "Admin access required",
      details: details || "You must be an administrator to perform this action",
      code: "ADMIN_REQUIRED"
    }),
    { 
      status: 403, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}
