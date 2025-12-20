import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import NavSection from "@/components/sidebar/NavSection";
import UserProfile from "@/components/sidebar/UserProfile";
import LogoutButton from "@/components/sidebar/LogoutButton";
import { adminNavGroups, investorNav, ibNav } from "@/config/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NavItem } from "@/types/navigation";
import { useUserRole } from "@/hooks/useUserRole";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAdmin?: boolean;
};

const Sidebar = ({ sidebarOpen, setSidebarOpen, isAdmin = false }: SidebarProps) => {
  const [userName, setUserName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get user role for proper navigation rendering
  const { isIB, isSuperAdmin, isLoading: roleLoading } = useUserRole();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
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

  // Determine which navigation to show based on role
  // Priority: Admin > IB > Investor
  const getNavType = (): "admin" | "ib" | "investor" => {
    if (isAdmin) return "admin";
    if (isIB) return "ib";
    return "investor";
  };

  const navType = getNavType();

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
          navType === "admin"
            ? "Admin navigation menu"
            : navType === "ib"
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
                if (navType === "admin") navigate("/admin");
                else if (navType === "ib") navigate("/ib/dashboard");
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

          {/* Search Bar (Admin only) */}
          {navType === "admin" && (
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
            {navType === "admin" && (
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
            {navType === "ib" && (
              <NavSection
                title="IB Portal"
                items={ibNav}
                onItemClick={handleNavigationClick}
                isExpanded={true}
              />
            )}

            {/* Investor Navigation */}
            {navType === "investor" && (
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
          <UserProfile userName={userName} isAdmin={navType === "admin"} />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
