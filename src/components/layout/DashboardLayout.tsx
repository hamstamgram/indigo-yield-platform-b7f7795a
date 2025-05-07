import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ContentArea from "./ContentArea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Checks if a user has admin privileges using the profiles table
 * @param userId The user ID to check
 * @returns Boolean indicating admin status
 */
const checkAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    // Check using profile table for existing field
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
    
    // Check if is_admin is true, or fallback to known admin email check
    return profile?.is_admin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false); // New flag to prevent loops
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
    // Skip if we've already checked authentication this session
    if (authChecked) return;
    
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
        
        // Check admin status through the profiles table
        const adminStatus = await checkAdminStatus(session.user.id);
        
        if (!isMounted) return;
        
        console.log("Admin status determined:", adminStatus);
        setIsAdmin(adminStatus);
        setAuthChecked(true); // Mark auth as checked to prevent loops
        
        // Force immediate redirect if needed
        if (adminStatus && currentPath === '/dashboard') {
          console.log("Admin on regular dashboard, redirecting to admin dashboard");
          navigate('/admin-dashboard', { replace: true });
        } else if (!adminStatus && isAdminRoute) {
          console.log("Non-admin trying to access admin route, redirecting to dashboard");
          navigate('/dashboard', { replace: true });
        }
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
  }, [navigate, toast, authChecked, currentPath, isAdminRoute]);
  
  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          // Force a refresh when auth changes
          setAuthChecked(false);
          setIsLoading(true);
          console.log("Auth state changed, refreshing...");
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
    return <div className="flex h-screen w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        isAdmin={isAdmin} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
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
