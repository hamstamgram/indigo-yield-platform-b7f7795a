import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/context';
import { PageLoadingSpinner } from '@/components/ui/loading-spinner';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoadingSpinner />;
  }

  if (!user) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // User is authenticated but not admin - redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}