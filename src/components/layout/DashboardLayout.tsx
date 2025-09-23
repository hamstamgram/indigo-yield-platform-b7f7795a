import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ContentArea from "./ContentArea";
import { useAuth } from "@/lib/auth/context";


const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentPath = location.pathname;
  
  // Determine if path is admin route with improved logic
  const isAdminRoute = 
    currentPath.startsWith('/admin') || 
    currentPath === '/admin-operations';
  
  // Get auth status from context - no need for complex checking since AuthProvider handles it
  const { user, loading: authLoading, isAdmin: userIsAdmin } = useAuth();
  
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        console.log("No user found, redirecting to login");
        navigate('/login', { replace: true });
        return;
      }
      
      setIsAdmin(userIsAdmin);
      setIsLoading(false);
      
      // Simple redirect logic - only redirect admin from /dashboard to /admin
      if (currentPath === '/dashboard' && userIsAdmin) {
        console.log("Admin on regular dashboard, redirecting to admin dashboard");
        navigate('/admin', { replace: true });
      }
    }
  }, [user, authLoading, userIsAdmin, navigate, currentPath, isAdminRoute]);
  
  // Set sidebar open state based on screen size
  useEffect(() => {
    // Close sidebar on mobile by default, keep open on desktop
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Function to toggle sidebar visibility
  const toggleSidebar = () => {
    console.log("Toggle sidebar clicked, current state:", sidebarOpen);
    setSidebarOpen(prevState => !prevState);
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
