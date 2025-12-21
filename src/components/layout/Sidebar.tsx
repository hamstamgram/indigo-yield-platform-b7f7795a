import { useState, useEffect, useRef } from "react";
import { X, Search, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import NavSection from "@/components/sidebar/NavSection";
import UserProfile from "@/components/sidebar/UserProfile";
import LogoutButton from "@/components/sidebar/LogoutButton";
import { adminNavGroups, investorNav, ibNav } from "@/config/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavItem } from "@/types/navigation";
import { useUserRole } from "@/hooks/useUserRole";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAdmin?: boolean;
};

type PortalView = "admin" | "ib" | "investor";

const Sidebar = ({ sidebarOpen, setSidebarOpen, isAdmin = false }: SidebarProps) => {
  const [userName, setUserName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  
  // Portal view state for multi-role users (IBs)
  const [portalView, setPortalView] = useState<PortalView>("investor");

  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get user role for proper navigation rendering
  const { isIB, isSuperAdmin, isLoading: roleLoading } = useUserRole();

  // Load saved portal view preference
  useEffect(() => {
    if (userId && isIB && !isAdmin) {
      const savedView = localStorage.getItem(`portal_view_${userId}`);
      if (savedView === "ib" || savedView === "investor") {
        setPortalView(savedView);
      } else {
        // Default IB users to IB portal view
        setPortalView("ib");
      }
    } else if (isAdmin) {
      setPortalView("admin");
    } else {
      setPortalView("investor");
    }
  }, [userId, isIB, isAdmin]);

  // Switch portal view and persist preference
  const switchPortal = (view: PortalView) => {
    setPortalView(view);
    if (userId) {
      localStorage.setItem(`portal_view_${userId}`, view);
    }
    // Navigate to appropriate dashboard
    if (view === "ib") {
      navigate("/ib");
    } else if (view === "investor") {
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();
        if (error) {
          console.warn("Failed to fetch profile:", error);
          setUserName(user.email?.split("@")[0] || "User");
        } else {
          const first = profile?.first_name || "";
          const last = profile?.last_name || "";
          const name = `${first} ${last}`.trim();
          setUserName(name.length > 0 ? name : user.email?.split("@")[0] || "User");
        }
      } else {
        navigate("/login");
      }
    };

    getUser();
  }, [navigate, isAdmin]);

  // Filter navigation items based on search
  const filterNavItems = (items: NavItem[], query: string) => {
    if (!query) return items;
    return items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
  };

  // Filter out superAdminOnly items if user is not super admin
  const filterBySuperAdmin = (items: NavItem[]) => {
    return items.filter((item) => !item.superAdminOnly || isSuperAdmin);
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSidebarOpen(false);
      return;
    }

    if (e.key === "/" && e.metaKey) {
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }

    // Arrow key navigation for menu items
    const menuItems = sidebarRef.current?.querySelectorAll('[role="menuitem"]');
    if (!menuItems || menuItems.length === 0) return;

    const currentIndex = Array.from(menuItems).indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
      (menuItems[nextIndex] as HTMLElement).focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
      (menuItems[prevIndex] as HTMLElement).focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      (menuItems[0] as HTMLElement).focus();
    } else if (e.key === "End") {
      e.preventDefault();
      (menuItems[menuItems.length - 1] as HTMLElement).focus();
    }
  };

  // Helper to close sidebar when navigating on mobile
  const handleNavigationClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Function to handle the actual sidebar closing
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Focus management for accessibility
  useEffect(() => {
    if (sidebarOpen && sidebarRef.current) {
      sidebarRef.current.focus();
    }
  }, [sidebarOpen]);

  // Determine active portal view
  const getActivePortal = (): PortalView => {
    if (isAdmin) return "admin";
    return portalView;
  };

  const activePortal = getActivePortal();
  
  // Check if user has multiple portal options (IB users)
  const hasMultiplePortals = isIB && !isAdmin;

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:z-auto focus:outline-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        role="navigation"
        aria-label={
          activePortal === "admin"
            ? "Admin navigation menu"
            : activePortal === "ib"
              ? "IB navigation menu"
              : "Main navigation menu"
        }
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border">
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => {
                if (activePortal === "admin") navigate("/admin");
                else if (activePortal === "ib") navigate("/ib");
                else navigate("/dashboard");
              }}
            >
              <img
                src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png"
                alt="Indigo Yield Fund"
                className="h-8 w-auto"
              />
            </div>
            <button
              onClick={closeSidebar}
              className="lg:hidden text-sidebar-foreground hover:text-sidebar-primary transition-colors p-2 rounded-md hover:bg-sidebar-accent min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Portal Switcher for IB users */}
          {hasMultiplePortals && (
            <div className="px-4 py-3 border-b border-sidebar-border">
              <div className="flex gap-2">
                <Button
                  variant={portalView === "ib" ? "primary" : "ghost"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => switchPortal("ib")}
                >
                  IB Portal
                </Button>
                <Button
                  variant={portalView === "investor" ? "primary" : "ghost"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => switchPortal("investor")}
                >
                  My Portfolio
                </Button>
              </div>
              <div className="flex items-center gap-1 text-xs text-sidebar-foreground/60 mt-2">
                <ArrowLeftRight className="h-3 w-3" />
                <span>Switch between portals</span>
              </div>
            </div>
          )}

          {/* Search Bar (Admin only) */}
          {activePortal === "admin" && (
            <div className="px-4 py-3 border-b border-sidebar-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sidebar-foreground/60" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search admin tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/60"
                />
              </div>
              <div className="text-xs text-sidebar-foreground/60 mt-1">Press ⌘ / to focus</div>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto" role="menu">
            {/* Admin Navigation */}
            {activePortal === "admin" && (
              <>
                {adminNavGroups.map((group) => {
                  const filteredItems = filterBySuperAdmin(
                    filterNavItems(group.items, searchQuery)
                  );
                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={group.title} className="mb-6">
                      <div className="w-full flex items-center justify-between px-2 py-1.5 mb-1 text-xs font-bold text-sidebar-foreground uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          {group.icon && <group.icon className="h-3 w-3" />}
                          <span>{group.title}</span>
                        </div>
                      </div>

                      <div id={`nav-group-${group.title}`} className="ml-0">
                        <NavSection
                          title=""
                          items={filteredItems}
                          onItemClick={handleNavigationClick}
                          showTitle={false}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* IB Navigation */}
            {activePortal === "ib" && (
              <NavSection
                title="IB Portal"
                items={ibNav}
                onItemClick={handleNavigationClick}
                isExpanded={true}
              />
            )}

            {/* Investor Navigation */}
            {activePortal === "investor" && (
              <NavSection
                title="Menu"
                items={investorNav}
                onItemClick={handleNavigationClick}
                isExpanded={true}
              />
            )}

            {/* Logout Button */}
            <div className="px-2 py-2 border-t border-sidebar-border mt-4 pt-4">
              <LogoutButton onLogout={handleNavigationClick} />
            </div>
          </nav>

          {/* User Profile */}
          <UserProfile userName={userName} isAdmin={activePortal === "admin"} />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
