import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ContentArea from "./ContentArea";
import { useAuth } from "@/lib/auth/context";
import { GlobalShortcuts } from "@/components/global/GlobalShortcuts";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  // Determine if path is admin route with improved logic
  const isAdminRoute = currentPath.startsWith("/admin") || currentPath === "/admin-operations";

  // Get auth status from context - no need for complex checking since AuthProvider handles it
  const { user, loading: authLoading, isAdmin: userIsAdmin, profile } = useAuth();

  useEffect(() => {
    // Wait for both auth and profile to be loaded
    if (!authLoading && profile !== null) {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      setIsAdmin(userIsAdmin);
      setIsLoading(false);

      // Simple redirect logic - only redirect admin from /dashboard to /admin
      if (currentPath === "/dashboard" && userIsAdmin) {
        navigate("/admin", { replace: true });
      }
    }
  }, [user, authLoading, userIsAdmin, profile, navigate, currentPath, isAdminRoute]);

  // Set sidebar open state based on screen size
  useEffect(() => {
    // Close sidebar on mobile by default, keep open on desktop
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Function to toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen((prevState) => !prevState);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Global Shortcuts & Action Bar */}
      <GlobalShortcuts />

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isAdmin={isAdmin} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
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
