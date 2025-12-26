/**
 * IB Route Guard
 * Protects routes that should only be accessible to Introducing Brokers
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { PageLoadingSpinner } from "@/components/ui/loading-spinner";

interface IBRouteProps {
  children: React.ReactNode;
}

export function IBRoute({ children }: IBRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  // Check if user has IB role
  const { data: hasIBRole, isLoading: roleLoading } = useQuery({
    queryKey: QUERY_KEYS.userIbRole(user?.id),
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "ib")
        .maybeSingle();

      if (error) {
        console.error("Error checking IB role:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
  });

  if (authLoading || roleLoading) {
    return <PageLoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasIBRole) {
    // If not an IB, redirect to regular dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
