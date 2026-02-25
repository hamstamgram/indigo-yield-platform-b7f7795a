import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ContentArea from "./ContentArea";
import { useAuth } from "@/services/auth";
import { useUserRole } from "@/hooks/auth";
import { logWarn } from "@/lib/logger";
import { ErrorBoundary } from "@/components/error";

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
    // If auth has resolved and there's no user, redirect immediately
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
      return;
    }

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
    // EXCEPTION: If admin has explicitly chosen to view as investor via portal switcher
    const portalPreference = user?.id ? localStorage.getItem(`portal_view_${user.id}`) : null;
    const adminWantsInvestorView = verifiedIsAdmin && portalPreference === "investor";

    if (isInvestorRoute && verifiedIsAdmin && !adminWantsInvestorView) {
      // Admin on investor routes -> redirect to admin dashboard (unless they explicitly chose investor view)
      navigate("/admin", { replace: true });
    } else if (isAdminRoute && !verifiedIsAdmin) {
      // Non-admin trying to access admin routes -> redirect to investor portal
      logWarn("DashboardLayout.redirect", { reason: "non-admin accessing admin route" });
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
  // Use lg breakpoint (1024px) to match sidebar's lg:static CSS classes
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    setSidebarOpen(isDesktop);
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
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20">
      {/* Sidebar - Floating Dock Style */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isAdmin={isAdmin} />

      {/* Main Content Area - calculated width to account for sidebar */}
      <div className="flex-1 flex flex-col h-full min-w-0 transition-all duration-300 ease-in-out relative">
        {/* Top Header - Context Bar */}
        <Header toggleSidebar={toggleSidebar} />

        {/* Scrollable Content Canvas */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 scroll-pb-24 sm:px-6 sm:pb-24 lg:px-8 lg:pb-10">
          <ErrorBoundary>
            <div className="min-h-full w-full rounded-2xl animate-fade-in relative mx-auto max-w-[1600px]">
              <Outlet />
            </div>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
