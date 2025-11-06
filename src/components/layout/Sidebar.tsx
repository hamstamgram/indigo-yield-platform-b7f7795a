import { useState, useEffect, useRef } from "react";
import { X, Search, ChevronDown, ChevronRight, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import NavSection from "@/components/sidebar/NavSection";
import UserProfile from "@/components/sidebar/UserProfile";
import LogoutButton from "@/components/sidebar/LogoutButton";
import { adminNavGroups, mainNav, accountNav, settingsNav } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUserAssets } from "@/hooks/useUserAssets";
import { CryptoIcon } from "@/components/CryptoIcons";
import { NavItem } from "@/types/navigation";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAdmin?: boolean;
};
const Sidebar = ({ sidebarOpen, setSidebarOpen, isAdmin = false }: SidebarProps) => {
  const [userName, setUserName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Main"]);
  const [focusedItem, setFocusedItem] = useState(-1);
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Get profile data via secure RPC to avoid RLS issues
        const { data, error } = await supabase.rpc("get_profile_basic", {
          user_id: user.id,
        });
        if (error) {
          console.warn("Failed to fetch profile via RPC:", error);
          setUserName(user.email?.split("@")[0] || "User");
          return;
        }
        // RPC returns single object or null, not array
        const profile = data as {
          first_name?: string;
          last_name?: string;
        } | null;
        const first = profile?.first_name || "";
        const last = profile?.last_name || "";
        const name = `${first} ${last}`.trim();
        setUserName(name.length > 0 ? name : user.email?.split("@")[0] || "User");
      } else {
        navigate("/login");
      }
    };
    getUser();
  }, [navigate]);

  // Fetch user's actual assets dynamically
  const { data: userAssets } = useUserAssets();

  // Filter navigation items based on admin status and search
  const filteredMainNav = isAdmin
    ? [] // Admins don't need the regular main nav
    : mainNav;

  // Generate dynamic asset navigation from user's actual positions
  const dynamicAssetNav = isAdmin
    ? []
    : (userAssets || []).map((asset) => ({
        title: asset.name,
        href: `/assets/${asset.symbol}`,
        icon: <CryptoIcon symbol={asset.symbol} className="h-5 w-5" />,
      }));

  const filteredAssetNav = dynamicAssetNav;

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupName) ? prev.filter((name) => name !== groupName) : [...prev, groupName]
    );
  };

  // Filter navigation items based on search
  const filterNavItems = (items: NavItem[], query: string) => {
    if (!query) return items;
    return items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
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
      // lg breakpoint
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
  return (
    <>
      {/* Mobile sidebar backdrop - clicking here should close the sidebar */}
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
        aria-label={isAdmin ? "Admin navigation menu" : "Main navigation menu"}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 flex-1">
              <div className="text-lg font-semibold text-sidebar-foreground">
                {isAdmin ? "Admin" : "Dashboard"}
              </div>
              {isAdmin}
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
          {isAdmin && (
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
            {/* Admin Navigation - Grouped and collapsible */}
            {isAdmin &&
              adminNavGroups.map((group) => {
                const filteredItems = filterNavItems(group.items, searchQuery);
                if (filteredItems.length === 0) return null;
                const isExpanded = expandedGroups.includes(group.title);
                return (
                  <div key={group.title} className="mb-4">
                    <Button
                      variant="ghost"
                      onClick={() => toggleGroup(group.title)}
                      className="w-full justify-between p-2 h-auto text-left bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground mb-2"
                      aria-expanded={isExpanded}
                      aria-controls={`nav-group-${group.title}`}
                    >
                      <div className="flex items-center gap-2">
                        {group.icon && <group.icon className="h-4 w-4" />}
                        <span className="font-medium">{group.title}</span>
                        <span className="text-xs bg-sidebar-primary text-sidebar-primary-foreground px-1.5 py-0.5 rounded">
                          {filteredItems.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>

                    {isExpanded && (
                      <div id={`nav-group-${group.title}`} className="ml-2">
                        <NavSection
                          title=""
                          items={filteredItems}
                          onItemClick={handleNavigationClick}
                          showTitle={false}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Main Navigation - Only for non-admin users */}
            {filteredMainNav.length > 0 && (
              <NavSection
                title="Main"
                items={filteredMainNav}
                onItemClick={handleNavigationClick}
                isExpanded={expandedGroups.includes("Main")}
                onToggle={() => toggleGroup("Main")}
              />
            )}

            {/* Asset Navigation - Only for non-admin users */}
            {filteredAssetNav.length > 0 && (
              <NavSection
                title="Assets"
                items={filteredAssetNav}
                onItemClick={handleNavigationClick}
                isExpanded={expandedGroups.includes("Assets")}
                onToggle={() => toggleGroup("Assets")}
              />
            )}

            {/* Settings Navigation - Only for non-admin users */}
            {!isAdmin && settingsNav.length > 0 && (
              <NavSection
                title="Settings"
                items={settingsNav}
                onItemClick={handleNavigationClick}
                isExpanded={expandedGroups.includes("Settings")}
                onToggle={() => toggleGroup("Settings")}
              />
            )}

            {/* Account Navigation */}
            <NavSection
              title="Account"
              items={accountNav}
              onItemClick={handleNavigationClick}
              isExpanded={expandedGroups.includes("Account")}
              onToggle={() => toggleGroup("Account")}
            />

            {/* Logout Button */}
            <div className="px-2 py-2 border-t border-sidebar-border mt-4 pt-4">
              <LogoutButton onLogout={handleNavigationClick} />
            </div>
          </nav>

          {/* User Profile */}
          <UserProfile userName={userName} isAdmin={isAdmin} />
        </div>
      </div>
    </>
  );
};
export default Sidebar;
