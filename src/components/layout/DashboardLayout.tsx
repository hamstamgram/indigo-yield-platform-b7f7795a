
import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
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
  return user?.email === 'hammadou@indigo.fund';
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check auth status and admin status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If not authenticated, redirect to login
          navigate('/login');
          return;
        }

        console.log("Session exists, checking admin status");
        
        // Check admin status through a dedicated function
        const adminStatus = await checkAdminStatus(session.user.id);
        setIsAdmin(adminStatus);
        
        // Route based on admin status and current path
        const currentPath = window.location.pathname;
        console.log("Current path:", currentPath);
        
        if (adminStatus && currentPath === '/dashboard') {
          console.log("Admin on regular dashboard - redirecting to admin dashboard");
          navigate('/admin-dashboard');
        } else if (!adminStatus && currentPath.includes('admin')) {
          console.log("Regular user on admin page - redirecting to regular dashboard");
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Auth check error:", error);
        toast({
          title: "Authentication error",
          description: "There was a problem verifying your account. Please try logging in again.",
          variant: "destructive",
        });
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate, toast]);
  
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
