import React from "react";
import { useAuth } from "@/services/auth";
import { Alert, AlertDescription } from "@/components/ui";
import { ShieldX } from "lucide-react";

interface RoleGateProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
  fallback?: React.ReactNode;
  showError?: boolean;
  className?: string;
}

/**
 * RoleGate component for protecting admin-only features
 *
 * @param children - Content to render if user has required role
 * @param requiredRole - Required role ('admin' or 'user'), defaults to 'admin'
 * @param fallback - Custom component to show when access is denied
 * @param showError - Whether to show default error message when access denied
 * @param className - Additional CSS classes
 */
export function RoleGate({
  children,
  requiredRole = "admin",
  fallback,
  showError = true,
  className = "",
}: RoleGateProps) {
  const { user, profile, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showError) {
      return (
        <Alert variant="destructive" className={className}>
          <ShieldX className="h-4 w-4" />
          <AlertDescription>You must be signed in to access this feature.</AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  // Check role requirements
  const hasRequiredRole = () => {
    if (requiredRole === "admin") {
      return profile?.is_admin === true;
    }
    return true; // 'user' role - any authenticated user
  };

  if (!hasRequiredRole()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showError) {
      return (
        <Alert variant="destructive" className={className}>
          <ShieldX className="h-4 w-4" />
          <AlertDescription>
            {requiredRole === "admin"
              ? "Admin access required to view this content."
              : "Insufficient permissions to access this feature."}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  // User has required role
  return <div className={className}>{children}</div>;
}

/**
 * Hook to check if user has specific role
 */
export function useRoleCheck(requiredRole: "admin" | "user" = "admin") {
  const { user, profile } = useAuth();

  const hasRole = React.useMemo(() => {
    if (!user) return false;

    if (requiredRole === "admin") {
      return profile?.is_admin === true;
    }

    return true; // Any authenticated user for 'user' role
  }, [user, profile, requiredRole]);

  return {
    hasRole,
    isAdmin: profile?.is_admin === true,
    isAuthenticated: !!user,
  };
}

/**
 * Higher-order component for role-based route protection
 */
export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: "admin" | "user" = "admin"
) {
  const ProtectedComponent = (props: P) => {
    return (
      <RoleGate requiredRole={requiredRole}>
        <Component {...props} />
      </RoleGate>
    );
  };

  ProtectedComponent.displayName = `withRoleProtection(${Component.displayName || Component.name})`;

  return ProtectedComponent;
}

// Convenience components for common role checks
export const AdminOnly = ({ children, ...props }: Omit<RoleGateProps, "requiredRole">) => (
  <RoleGate requiredRole="admin" {...props}>
    {children}
  </RoleGate>
);

export const AuthenticatedOnly = ({ children, ...props }: Omit<RoleGateProps, "requiredRole">) => (
  <RoleGate requiredRole="user" {...props}>
    {children}
  </RoleGate>
);
