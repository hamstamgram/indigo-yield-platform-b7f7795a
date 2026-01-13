import { Navigate, useLocation } from "react-router-dom";
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

  // SECURITY: Double-check admin status from both sources
  // Both must agree for access to be granted
  const isVerifiedAdmin = authIsAdmin && roleIsAdmin;

  if (!isVerifiedAdmin) {
    console.warn("[AdminRoute] Access denied - admin verification failed", {
      authIsAdmin,
      roleIsAdmin,
      userId: user.id,
    });
    // User is authenticated but not verified admin - redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
