import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { logWarn } from "@/lib/logger";
import { useAuth } from "@/services/auth";
import { PageLoadingSpinner } from "@/components/ui";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, profile } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  // Safety timeout: redirect to login if auth doesn't resolve within 3s
  useEffect(() => {
    const timeout = setTimeout(() => {
      setTimedOut(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Wait for both auth and profile to be loaded before making decisions
  const isLoading = loading || (user && !profile);

  if (isLoading && timedOut && !user) {
    logWarn("ProtectedRoute.loadingTimeout", {
      message: "Auth loading timed out after 3s with no user, redirecting to login",
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  if (!user) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
