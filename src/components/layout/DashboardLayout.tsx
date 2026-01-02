import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ContentArea from "./ContentArea";
import { useAuth } from "@/lib/auth/context";
import { useUserRole } from "@/hooks/auth";
import { GlobalShortcuts } from "@/components/global";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);

  const currentPath = location.pathname;

  // Determine if path is admin route
  const isAdminRoute = currentPath.startsWith("/admin") || currentPath === "/admin-operations";

  // Get auth status from both context AND useUserRole hook for double verification
  const { user, loading: authLoading, isAdmin: authIsAdmin, profile } = useAuth();
  const { isAdmin: roleIsAdmin, isLoading: roleLoading } = useUserRole();

  useEffect(() => {
    // Wait for both auth context AND role check to complete
    const isFullyLoaded = !authLoading && !roleLoading && profile !== null;
    
    if (!isFullyLoaded) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    // SECURITY: Use role from useUserRole as source of truth (queries user_roles table directly)
    const verifiedIsAdmin = authIsAdmin && roleIsAdmin;
    setIsAdmin(verifiedIsAdmin);
    setIsLoading(false);

    // Deterministic redirect logic - only redirect once per mount
    if (!hasRedirectedRef.current) {
      if (currentPath === "/dashboard" && verifiedIsAdmin) {
        // Admin on investor dashboard -> redirect to admin
        hasRedirectedRef.current = true;
        navigate("/admin", { replace: true });
      } else if (isAdminRoute && !verifiedIsAdmin) {
        // Non-admin trying to access admin routes -> redirect to dashboard
        hasRedirectedRef.current = true;
        console.warn("[DashboardLayout] Non-admin accessing admin route, redirecting");
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, authLoading, roleLoading, authIsAdmin, roleIsAdmin, profile, navigate, currentPath, isAdminRoute]);

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
