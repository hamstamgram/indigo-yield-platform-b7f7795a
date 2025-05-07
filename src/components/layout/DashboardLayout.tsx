
import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ContentArea from "./ContentArea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check auth status and admin status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If not authenticated, redirect to login
          navigate('/login');
          return;
        }
        
        // For testing admin status based on known admin email
        // This is a fallback in case the profiles query fails
        const isKnownAdmin = session.user.email === 'hammadou@indigo.fund';
        
        try {
          // Try to check if user is admin from profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();
            
          if (error) {
            console.error("Error fetching admin status from profile:", error);
            // Fall back to email check if there's an error with profiles
            setIsAdmin(isKnownAdmin);
          } else {
            setIsAdmin(profile?.is_admin || isKnownAdmin);
          }
        } catch (error) {
          console.error("Exception when checking admin status:", error);
          // Fall back to email check on exception
          setIsAdmin(isKnownAdmin);
        }
        
        // Route based on admin status and current path
        const currentPath = window.location.pathname;
        
        if (isKnownAdmin && currentPath === '/dashboard') {
          navigate('/admin-dashboard');
        } else if (!isKnownAdmin && currentPath.includes('admin')) {
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

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

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
