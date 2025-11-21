import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";

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

    // If not authenticated and no preview mode, redirect to login
    if (!session && !import.meta.env.VITE_PREVIEW_ADMIN && !localStorage.getItem("app.role")) {
      console.log("No session found and not in preview mode, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    // If not admin, redirect to LP dashboard
    if (!isAdmin) {
      console.log("User is not admin, redirecting to", redirectTo);
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
