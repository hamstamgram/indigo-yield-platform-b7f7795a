import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/services/auth";
import { PageLoadingSpinner } from "@/components/ui";
import { useUserRole } from "@/hooks";
import { useInvestorRealtimeInvalidation } from "@/features/investor/shared/hooks/useInvestorRealtimeInvalidation";

interface InvestorRouteProps {
  children: React.ReactNode;
}

export function InvestorRoute({ children }: InvestorRouteProps) {
  const { user, loading, profile } = useAuth();
  const { isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  useInvestorRealtimeInvalidation(user?.id);

  if (loading || roleLoading || (user && !profile)) {
    return <PageLoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
