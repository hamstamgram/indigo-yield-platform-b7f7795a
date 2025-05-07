
import { useState, useEffect, useRef } from "react";
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
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // More precise control of auth and redirect logic
  const initialAuthCheckDone = useRef(false);
  const redirectAttempted = useRef(false);
  const currentPath = location.pathname;
  const isAdminRoute = currentPath.includes('admin');
  
  // Check auth status and admin status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Skip if we've already done the initial check
        if (initialAuthCheckDone.current) return;
        
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If not authenticated, redirect to login
          console.log("No session found, redirecting to login");
          navigate('/login', { replace: true });
          return;
        }

        console.log("Session exists, checking admin status");
        
        // Check admin status through a dedicated function
        const adminStatus = await checkAdminStatus(session.user.id);
        setIsAdmin(adminStatus);
        
        // Mark initial auth check as complete
        initialAuthCheckDone.current = true;
        
        // Route based on admin status and current path - only on initial load
        // This prevents unnecessary redirects when navigating within the app
        if (!redirectAttempted.current) {
          redirectAttempted.current = true;
          
          if (adminStatus && currentPath === '/dashboard') {
            console.log("Admin on regular dashboard - redirecting to admin dashboard");
            navigate('/admin-dashboard', { replace: true });
          } else if (!adminStatus && isAdminRoute) {
            console.log("Regular user on admin page - redirecting to regular dashboard");
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        toast({
          title: "Authentication error",
          description: "There was a problem verifying your account. Please try logging in again.",
          variant: "destructive",
        });
        navigate('/login', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate, toast, currentPath, isAdminRoute]);
  
  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        // Reset the auth check when session changes
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          initialAuthCheckDone.current = false;
          redirectAttempted.current = false;
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);
  
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
