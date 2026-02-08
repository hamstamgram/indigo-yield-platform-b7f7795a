import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/auth";

interface RequireAdminProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * RequireAdmin component that guards routes requiring admin access
 * Uses AuthContext for role checking and redirects non-admin users
 */
export default function RequireAdmin({ children, redirectTo = "/dashboard" }: RequireAdminProps) {
  const { loading, session, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    // SECURITY: Only allow preview mode via environment variable, never localStorage
    // This prevents users from bypassing admin checks by manipulating localStorage
    if (!session && !import.meta.env.VITE_PREVIEW_ADMIN) {
      navigate("/login", { replace: true });
      return;
    }

    // If not admin (verified server-side via AuthContext), redirect to dashboard
    if (!isAdmin) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, session, isAdmin, navigate, redirectTo]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
