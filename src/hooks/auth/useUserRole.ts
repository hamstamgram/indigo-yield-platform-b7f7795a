/**
 * useUserRole Hook
 * Checks the current user's role from user_roles table
 * Used for role-based navigation rendering
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/services/auth";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";

export type UserRole = "admin" | "ib" | "super_admin" | "investor";

interface UseUserRoleResult {
  /** Primary role of the user */
  role: UserRole;
  /** Whether the user has admin role */
  isAdmin: boolean;
  /** Whether the user has IB role */
  isIB: boolean;
  /** Whether the user has super_admin role */
  isSuperAdmin: boolean;
  /** Whether role check is loading */
  isLoading: boolean;
  /** All roles the user has */
  roles: string[];
}

export function useUserRole(): UseUserRoleResult {
  const { user, loading: authLoading, isAdmin: authIsAdmin } = useAuth();

  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: QUERY_KEYS.userRoles(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user roles:", error);
        return [];
      }

      return (data || []).map((r) => r.role as string);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const roles = userRoles || [];
  const isLoading = authLoading || rolesLoading;

  // Check specific roles
  const hasIBRole = roles.includes("ib");
  const hasSuperAdminRole = roles.includes("super_admin");
  const hasAdminRole = roles.includes("admin") || authIsAdmin;

  // Determine primary role (priority: super_admin > admin > ib > investor)
  let role: UserRole = "investor";
  if (hasSuperAdminRole) {
    role = "super_admin";
  } else if (hasAdminRole) {
    role = "admin";
  } else if (hasIBRole) {
    role = "ib";
  }

  return {
    role,
    isAdmin: hasAdminRole || hasSuperAdminRole,
    isIB: hasIBRole,
    isSuperAdmin: hasSuperAdminRole,
    isLoading,
    roles,
  };
}

export default useUserRole;
