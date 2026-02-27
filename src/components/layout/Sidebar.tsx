import { useState, useEffect, useRef } from "react";
import { X, Search, ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NavSection from "@/components/sidebar/NavSection";
import UserProfile from "@/components/sidebar/UserProfile";
import LogoutButton from "@/components/sidebar/LogoutButton";
import { adminNavGroups, investorNav } from "@/config/navigation";
import { Input, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { NavItem } from "@/types/navigation";
import { useUserRole, useHasInvestorPositions } from "@/hooks";
import { useAuth } from "@/services/auth";
import { useCurrentProfile } from "@/hooks";
type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAdmin?: boolean;
};

type PortalView = "admin" | "investor";

const Sidebar = ({ sidebarOpen, setSidebarOpen, isAdmin = false }: SidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Portal view state for multi-role users (IBs)
  const [portalView, setPortalView] = useState<PortalView>("investor");

  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get auth context and profile data
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile();
  const userId = user?.id || null;

  // Compute userName from profile
  const userName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
      user?.email?.split("@")[0] ||
      "User"
    : user?.email?.split("@")[0] || "User";

  // Get user role for proper navigation rendering
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();

  // Check if admin user also has investor positions
  const { hasPositions: hasInvestorPositions } = useHasInvestorPositions();

  // Load saved portal view preference
  useEffect(() => {
    if (userId && isAdmin && hasInvestorPositions) {
      const savedView = localStorage.getItem(`portal_view_${userId}`);
      if (savedView === "admin" || savedView === "investor") {
        setPortalView(savedView);
      } else {
        setPortalView("admin");
      }
    } else if (isAdmin) {
      setPortalView("admin");
    } else {
      setPortalView("investor");
    }
  }, [userId, isAdmin, hasInvestorPositions]);

  // Switch portal view and persist preference
  const switchPortal = (view: PortalView) => {
    setPortalView(view);
    if (userId) {
      localStorage.setItem(`portal_view_${userId}`, view);
    }
    if (view === "admin") {
      navigate("/admin");
    } else if (view === "investor") {
      navigate("/investor");
    }
  };

  // Redirect to login if no user
  useEffect(() => {
    if (!user && !roleLoading) {
      navigate("/login");
    }
  }, [user, roleLoading, navigate]);

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
    if (isAdmin && hasInvestorPositions) {
      return portalView;
    }
    if (isAdmin) return "admin";
    return "investor";
  };

  const activePortal = getActivePortal();

  // Check if user has multiple portal options (admins with positions only)
  const hasMultiplePortals = isAdmin && hasInvestorPositions;
  const isAdminWithPositions = isAdmin && hasInvestorPositions;

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Glassy Dock */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-all duration-300 ease-spring",
          "lg:static lg:translate-x-0 lg:z-0 lg:h-screen lg:flex lg:flex-col lg:py-6 lg:pl-6",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarOpen && "h-full shadow-2xl lg:shadow-none"
        )}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          className={cn(
            "flex flex-col h-full bg-sidebar/95 backdrop-blur-xl border-r border-border/50 lg:border-none lg:bg-sidebar lg:rounded-2xl lg:shadow-sm overflow-hidden",
            "lg:ring-1 lg:ring-border/50"
          )}
        >
          {/* Sidebar Header - Brand */}
          <div className="flex items-center justify-between px-6 py-6 lg:py-8">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                if (activePortal === "admin") navigate("/admin");
                else navigate("/investor");
              }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img
                  src="/brand/logo-white.svg"
                  alt="Indigo Yield Fund"
                  className="h-9 w-auto relative z-10 transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <button
              onClick={closeSidebar}
              className="lg:hidden text-sidebar-foreground/70 hover:text-primary transition-colors p-2 rounded-full hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Portal Switcher for users with multiple portals */}
          {hasMultiplePortals && (
            <div className="px-5 pb-6">
              <div className="p-1 bg-sidebar-accent/40 rounded-xl flex gap-1 border border-border/30">
                {isAdminWithPositions && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "flex-1 text-xs font-semibold rounded-lg transition-all duration-150",
                        portalView === "admin"
                          ? "bg-primary text-white shadow-sm hover:bg-primary/90"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                      )}
                      onClick={() => switchPortal("admin")}
                    >
                      Admin
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "flex-1 text-xs font-semibold rounded-lg transition-all duration-150",
                        portalView === "investor"
                          ? "bg-primary text-white shadow-sm hover:bg-primary/90"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                      )}
                      onClick={() => switchPortal("investor")}
                    >
                      Investor
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Search Bar (Admin only) */}
          {activePortal === "admin" && (
            <div className="px-5 pb-6">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-150" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Jump to..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-secondary/30 border-border/50 focus:bg-secondary/50 focus:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/30 transition-all duration-150 rounded-xl text-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground border border-border/50 rounded px-1.5 py-0.5 opacity-40">
                  ⌘K
                </div>
              </div>
            </div>
          )}

          {/* Nav - Scrollable Area */}
          <nav
            className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar scroll-smooth mask-linear-fade"
            role="menu"
          >
            {/* Admin Navigation */}
            {activePortal === "admin" && (
              <>
                {adminNavGroups.map((group) => {
                  const filteredItems = filterBySuperAdmin(
                    filterNavItems(group.items, searchQuery)
                  );
                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={group.title} className="mb-3 px-2">
                      {group.title && (
                        <h4 className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sidebar-foreground/35 font-display">
                          {group.icon && <group.icon className="h-3 w-3" />}
                          {group.title}
                        </h4>
                      )}

                      <div id={`nav-group-${group.title}`}>
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

            {/* Investor Navigation */}
            {activePortal === "investor" && (
              <div className="px-2">
                <NavSection
                  title="Menu"
                  items={investorNav}
                  onItemClick={handleNavigationClick}
                  isExpanded={true}
                />
              </div>
            )}
          </nav>

          {/* Footer Area */}
          <div className="mt-auto border-t border-sidebar-border/30 bg-sidebar/30 backdrop-blur-md">
            <UserProfile userName={userName} isAdmin={activePortal === "admin"} />
            <div className="px-4 pb-4">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
