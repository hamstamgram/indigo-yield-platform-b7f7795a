import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ContentArea from "./ContentArea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Checks if a user has admin privileges
 * @param userId The user ID to check
 * @returns Boolean indicating admin status
 */
const checkAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    // First check using profile table for existing field
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
      
    if (profile?.is_admin) {
      return true;
    }
    
    // Alternative check for known admin emails (fallback)
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email?.toLowerCase() === 'hammadou@indigo.fund';
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const currentPath = location.pathname;
  
  // Determine if path is admin route with improved logic
  const isAdminRoute = 
    currentPath.startsWith('/admin') || 
    currentPath === '/admin-dashboard' || 
    currentPath === '/admin-investors';
  
  // Check auth status and admin status - this runs once on component mount
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If not authenticated, redirect to login
          console.log("No session found, redirecting to login");
          if (isMounted) {
            navigate('/login', { replace: true });
          }
          return;
        }

        console.log("Session exists, checking admin status");
        
        // Check admin status through a dedicated function
        const adminStatus = await checkAdminStatus(session.user.id);
        
        if (!isMounted) return;
        
        console.log("Admin status:", adminStatus, "Current path:", currentPath);
        setIsAdmin(adminStatus);
        
        // Don't perform any redirects here to avoid redirect loops
        // Let the individual components decide if they need to redirect
      } catch (error) {
        console.error("Auth check error:", error);
        if (isMounted) {
          toast({
            title: "Authentication error",
            description: "There was a problem verifying your account. Please try logging in again.",
            variant: "destructive",
          });
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
  }, [navigate, toast, currentPath]);
  
  // For admin routes, perform access control at the layout level
  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;
    
    // For admin routes, only redirect if user is definitely not an admin
    if (isAdminRoute && isAdmin === false) {
      console.log("Non-admin trying to access admin route, redirecting to dashboard");
      navigate('/dashboard', { replace: true });
    }
    
    // For regular dashboard, redirect admins to admin dashboard
    if (currentPath === '/dashboard' && isAdmin) {
      console.log("Admin on regular dashboard, redirecting to admin dashboard");
      navigate('/admin-dashboard', { replace: true });
    }
  }, [currentPath, isAdmin, isAdminRoute, isLoading, navigate]);
  
  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          window.location.reload();
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Set sidebar open state based on screen size
  useEffect(() => {
    // Close sidebar on mobile by default, keep open on desktop
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Function to toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        isAdmin={isAdmin} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <Header toggleSidebar={toggleSidebar} />

        {/* Content Area */}
        <ContentArea>
          <Outlet />
        </ContentArea>
      </div>
    </div>
  );
};

export default DashboardLayout;
