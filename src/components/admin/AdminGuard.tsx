/**
 * Admin Guard Component
 * Protects admin-only routes with role-based access control
 */

import React from "react";
import { Navigate, Link } from "react-router-dom";
import { Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading, isAdmin } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4">
        <div className="text-center max-w-md">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You do not have permission to access this area. Admin privileges are required.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
