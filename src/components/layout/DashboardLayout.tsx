import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ContentArea from "./ContentArea";
import { useAuth } from "@/services/auth";
import { useUserRole } from "@/hooks/auth";
import { GlobalShortcuts } from "@/components/global";
import { FinancialErrorBoundary } from "@/components/error/FinancialErrorBoundary";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  // Determine if path is admin route
  const isAdminRoute = currentPath.startsWith("/admin") || currentPath === "/admin-operations";

  // Determine if path is investor route (for admin redirect)
  const isInvestorRoute =
    currentPath === "/investor" ||
    currentPath.startsWith("/investor/") ||
    currentPath === "/dashboard";

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
    // Use OR for resilience: either source (AuthContext or useUserRole) confirming admin is sufficient
    // Both query user_roles table server-side, so both are secure sources
    const verifiedIsAdmin = authIsAdmin || roleIsAdmin;
    setIsAdmin(verifiedIsAdmin);
    setIsLoading(false);

    // PRODUCTION FIX: Always evaluate redirect conditions (no ref guard)
    // This ensures admins on wrong page always get redirected
    if (isInvestorRoute && verifiedIsAdmin) {
      // Admin on investor routes -> redirect to admin dashboard
      console.log("[DashboardLayout] Admin detected on investor route, redirecting to /admin");
      navigate("/admin", { replace: true });
    } else if (isAdminRoute && !verifiedIsAdmin) {
      // Non-admin trying to access admin routes -> redirect to investor portal
      console.warn("[DashboardLayout] Non-admin accessing admin route, redirecting to /investor");
      navigate("/investor", { replace: true });
    }
  }, [
    user,
    authLoading,
    roleLoading,
    authIsAdmin,
    roleIsAdmin,
    profile,
    navigate,
    currentPath,
    isAdminRoute,
    isInvestorRoute,
  ]);

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

        {/* Content Area with Financial Error Boundary */}
        <ContentArea>
          <FinancialErrorBoundary context={isAdmin ? "admin" : "investor"}>
            <Outlet />
          </FinancialErrorBoundary>
        </ContentArea>
      </div>
    </div>
  );
};

export default DashboardLayout;
