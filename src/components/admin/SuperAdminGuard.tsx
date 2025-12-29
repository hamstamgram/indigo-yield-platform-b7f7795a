/**
 * Super Admin Guard Component
 * Protects super-admin-only routes/operations with role-based access control
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { useSuperAdminCheck } from "@/hooks/data/admin";

interface SuperAdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SuperAdminGuard({ children, fallback }: SuperAdminGuardProps) {
  const { user, loading, isAdmin } = useAuth();

  // Use React Query hook for checking super admin status
  const { data: isSuperAdmin, isLoading: checkingRole } = useSuperAdminCheck(user?.id);

  // Show loading state
  if (loading || checkingRole) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is not admin at all, redirect
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is admin but not super admin, show fallback or access denied
  if (!isSuperAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex flex-col items-center justify-center h-64 px-4">
        <div className="text-center max-w-md">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Super Admin Required</h2>
          <p className="text-muted-foreground">
            This action requires Super Admin privileges. Please contact a Super Admin for assistance.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check if current user is super admin
 * Uses React Query for caching and state management
 */
export function useSuperAdmin() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { data: isSuperAdmin = false, isLoading } = useSuperAdminCheck(user?.id);

  return {
    isSuperAdmin,
    isAdmin,
    loading: authLoading || isLoading,
  };
}
