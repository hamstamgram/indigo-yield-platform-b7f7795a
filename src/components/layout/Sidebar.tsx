import { useState, useEffect, useRef } from "react";
import { X, Search, Coins, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import NavSection from "@/components/sidebar/NavSection";
import UserProfile from "@/components/sidebar/UserProfile";
import LogoutButton from "@/components/sidebar/LogoutButton";
import { adminNavGroups, mainNav } from "@/config/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NavItem } from "@/types/navigation";
import { getAssetLogo } from "@/utils/assets";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAdmin?: boolean;
};

const Sidebar = ({ sidebarOpen, setSidebarOpen, isAdmin = false }: SidebarProps) => {
  // Temporary empty arrays for removed nav items
  const accountNav: NavItem[] = [];
  const settingsNav: NavItem[] = [];

  const [userName, setUserName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fundItems, setFundItems] = useState<NavItem[]>([]); // Dynamic Funds
  const [isFundsExpanded, setIsFundsExpanded] = useState(true);

  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

    // Fetch Active Funds for Dynamic Menu
    const getFunds = async () => {
      const { data: assets } = await supabase
        .from("assets")
        .select("symbol, name, icon_url")
        .eq("is_active", true)
        .order("symbol");
      
      if (assets) {
        console.log("Fetched assets for funds:", assets);
        const items: NavItem[] = assets.map(asset => ({
          title: asset.name,
          href: isAdmin ? `/admin/funds/${asset.symbol}` : `/funds/${asset.symbol}`,
          icon: asset.icon_url ? (
            <img 
              src={getAssetLogo(asset.symbol)} 
              alt={asset.name} 
              className="h-4 w-4 rounded-full object-cover" 
            />
          ) : (
            <Coins className="h-4 w-4" />
          )
        }));
        setFundItems(items);
      }
    };

    getUser();
    getFunds();
  }, [navigate, isAdmin]);

  // Filter navigation items based on admin status and search
  const filteredMainNav = isAdmin
    ? [] // Admins don't need the regular main nav
    : mainNav;

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
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => navigate(isAdmin ? "/admin" : "/dashboard")}
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
            {/* Admin Navigation */}
            {isAdmin && (
              <>
                {/* Dynamic Funds for Admin */}
                {fundItems.length > 0 && (
                  <div className="mb-6">
                    <div 
                      className="w-full flex items-center justify-between px-2 py-1.5 mb-1 text-xs font-bold text-sidebar-foreground uppercase tracking-wider cursor-pointer hover:text-sidebar-primary transition-colors"
                      onClick={() => setIsFundsExpanded(!isFundsExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <Coins className="h-3 w-3" />
                        <span>Fund Management</span>
                      </div>
                      {isFundsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </div>
                    {isFundsExpanded && (
                      <NavSection
                        title=""
                        items={filterNavItems(fundItems, searchQuery)}
                        onItemClick={handleNavigationClick}
                        showTitle={false}
                      />
                    )}
                  </div>
                )}

                {/* Static Admin Groups */}
                {adminNavGroups.map((group) => {
                  const filteredItems = filterNavItems(group.items, searchQuery);
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

            {/* Investor Navigation */}
            {!isAdmin && (
              <>
                {/* Main Nav */}
                {filteredMainNav.length > 0 && (
                  <NavSection
                    title="Main"
                    items={filteredMainNav}
                    onItemClick={handleNavigationClick}
                    isExpanded={true}
                  />
                )}

                {/* My Funds (Dynamic) */}
                {fundItems.length > 0 && (
                  <div className="mb-6">
                    <div 
                      className="w-full flex items-center justify-between px-2 py-1.5 mb-1 text-xs font-bold text-sidebar-foreground uppercase tracking-wider cursor-pointer hover:text-sidebar-primary transition-colors"
                      onClick={() => setIsFundsExpanded(!isFundsExpanded)}
                    >
                      <span>My Funds</span>
                      {isFundsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </div>
                    {isFundsExpanded && (
                      <NavSection
                        title=""
                        items={fundItems}
                        onItemClick={handleNavigationClick}
                        showTitle={false}
                        isExpanded={true}
                      />
                    )}
                  </div>
                )}

                {/* Settings */}
                {settingsNav.length > 0 && (
                  <NavSection
                    title="Settings"
                    items={settingsNav}
                    onItemClick={handleNavigationClick}
                    isExpanded={true}
                  />
                )}
              </>
            )}

            {/* Account Navigation */}
            <NavSection
              title="Account"
              items={accountNav}
              onItemClick={handleNavigationClick}
              isExpanded={true}
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