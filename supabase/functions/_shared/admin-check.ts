import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AdminCheckResult {
  isAdmin: boolean;
  email?: string;
  userId?: string;
  error?: string;
}

/**
 * CANONICAL ADMIN CHECK - Use this across ALL edge functions
 *
 * This function checks admin status using the user_roles table only.
 * The profiles.is_admin fallback has been removed (P1-3 security fix).
 *
 * IMPORTANT: Must be called with a service role client to bypass RLS.
 *
 * @param supabase - Service role Supabase client
 * @param userId - The user ID to check
 * @returns AdminCheckResult with isAdmin status and user info
 */
export async function checkAdminAccess(
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<AdminCheckResult> {
  try {
    // Step 1: Check user_roles table first (preferred method)
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      console.error("Admin check - roles query error:", rolesError.message);
      // Continue to fallback check
    }

    const hasAdminRole = userRoles?.some(
      (r: { role: string }) => r.role === "admin" || r.role === "super_admin"
    );

    if (hasAdminRole) {
      // Get email for logging
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();

      return {
        isAdmin: true,
        email: profile?.email,
        userId,
      };
    }

    // No fallback to profiles.is_admin -- user_roles is the sole authority
    return {
      isAdmin: false,
      userId,
      error: "User does not have admin role in user_roles table",
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Admin check exception:", err);
    return {
      isAdmin: false,
      userId,
      error: errorMessage,
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
      code: "ADMIN_REQUIRED",
    }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
