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

        console.log("Session exists, checking admin status");
        
        // For testing admin status based on known admin email
        // This is reliable even if the profiles query fails
        const isKnownAdmin = session.user.email === 'hammadou@indigo.fund';
        console.log("Is known admin email?", isKnownAdmin);
        
        // Set admin status based on email check
        setIsAdmin(isKnownAdmin);
        
        // Route based on admin status and current path
        const currentPath = window.location.pathname;
        console.log("Current path:", currentPath);
        
        if (isKnownAdmin && currentPath === '/dashboard') {
          console.log("Admin on regular dashboard - redirecting to admin dashboard");
          navigate('/admin-dashboard');
        } else if (!isKnownAdmin && currentPath.includes('admin')) {
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
