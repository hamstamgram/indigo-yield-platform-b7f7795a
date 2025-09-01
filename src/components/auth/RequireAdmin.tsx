import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RequireAdminProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Checks if a user has admin privileges using the database function
 * @param userId The user ID to check
 * @returns Boolean indicating admin status
 */
const checkAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    console.log("Checking admin status via function for user:", userId);
    
    // Use the RPC function to check admin status to avoid RLS issues
    const { data, error } = await supabase
      .rpc('get_user_admin_status', { user_id: userId });
      
    if (error) {
      console.error("Error checking admin status via function:", error);
      
      // Fallback to direct query if function fails
      const { data: profile, error: queryError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
        
      if (queryError) {
        console.error("Error checking admin status via direct query:", queryError);
        return false;
      }
      
      console.log("Admin check result via direct query:", profile);
      return profile?.is_admin === true;
    }
    
    console.log("Admin check result via function:", data);
    return data === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

/**
 * RequireAdmin component that guards routes requiring admin access
 * Redirects non-admin users to the LP dashboard
 */
export default function RequireAdmin({ children, redirectTo = "/dashboard" }: RequireAdminProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // If not authenticated, redirect to login
          console.log("No session found, redirecting to login");
          if (isMounted) {
            navigate('/login', { replace: true });
          }
          return;
        }

        console.log("Checking admin status for user:", session.user.id);
        
        // Check admin status through the function
        const adminStatus = await checkAdminStatus(session.user.id);
        
        if (!isMounted) return;
        
        console.log("Admin status determined:", adminStatus);
        setIsAdmin(adminStatus);

        // If not admin, redirect to LP dashboard
        if (!adminStatus) {
          console.log("User is not admin, redirecting to", redirectTo);
          navigate(redirectTo, { replace: true });
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (isMounted) {
          navigate('/login', { replace: true });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
    };
  }, [navigate, redirectTo]);

  if (isLoading) {
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
