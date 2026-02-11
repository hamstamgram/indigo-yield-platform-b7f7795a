import { Navigate, useLocation } from "react-router-dom";
import { logWarn } from "@/lib/logger";
import { useAuth } from "@/services/auth";
import { useUserRole } from "@/hooks/auth";
import { useAdminInitialPrefetch } from "@/hooks/useAdminInitialPrefetch";
import { PageLoadingSpinner } from "@/components/ui";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - Hardened admin route guard
 * Double-checks admin status using both AuthContext and useUserRole hook
 * to prevent any race condition or inconsistent state issues
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading, isAdmin: authIsAdmin, profile } = useAuth();
  const { isAdmin: roleIsAdmin, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  // Prefetch high-priority admin data after page load
  useAdminInitialPrefetch();

  // Wait for both auth context AND role check to complete
  const isLoading = authLoading || roleLoading || (user && !profile);

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  if (!user) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // SECURITY: Frontend OR check is defense-in-depth only.
  // The authoritative admin gate is Supabase RLS (is_admin() on every table).
  // OR is used here because AND caused false-negative race conditions when
  // one source (AuthContext vs useUserRole) resolves before the other.
  // Both sources query the user_roles table server-side, so both are trustworthy.
  const isVerifiedAdmin = authIsAdmin || roleIsAdmin;

  if (!isVerifiedAdmin) {
    logWarn("AdminRoute.accessDenied", {
      authIsAdmin,
      roleIsAdmin,
    });
    // User is authenticated but not verified admin - redirect to investor portal
    return <Navigate to="/investor" replace />;
  }

  return <>{children}</>;
}
