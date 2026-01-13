import { NavItem } from "@/types/navigation";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { usePrefetchOnHover } from "@/hooks/usePrefetchOnHover";

type NavSectionProps = {
  title: string;
  items: NavItem[];
  onItemClick?: () => void;
  showTitle?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
};

const NavSection = ({
  title,
  items,
  onItemClick,
  showTitle = true,
  className,
}: NavSectionProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const { prefetchRoute, cancelPrefetch } = usePrefetchOnHover();

  // Manage sub-nav expanded states at component level (not inside map callback)
  const [expandedSubNavs, setExpandedSubNavs] = useState<Record<number, boolean>>(() => {
    // Initialize with active items expanded
    const initial: Record<number, boolean> = {};
    items.forEach((item, index) => {
      if (item.subNav) {
        initial[index] = location.pathname.startsWith(item.href);
      }
    });
    return initial;
  });

  const handleNavigation = async (href: string) => {
    // Add loading state for heavy routes
    const heavyRoutes = ["/admin/reports", "/admin/audit", "/statements"];
    if (heavyRoutes.includes(href)) {
      setLoadingItems((prev) => [...prev, href]);
    }

    navigate(href);
    onItemClick?.();

    // Remove loading state after navigation
    setTimeout(() => {
      setLoadingItems((prev) => prev.filter((item) => item !== href));
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent, href: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNavigation(href);
    }
  };

  const isActive = (href: string) => {
    // Handle exact matches
    if (location.pathname === href) {
      return true;
    }

    // Handle admin routes - if we're on an admin route and the nav item is also admin
    if (location.pathname.startsWith("/admin") && href.startsWith("/admin")) {
      // For admin dashboard, only highlight if exact match
      if (href === "/admin" && location.pathname === "/admin") {
        return true;
      }
      // For other admin routes, check if current path starts with the nav href
      if (href !== "/admin" && location.pathname.startsWith(href)) {
        return true;
      }
    }

    // Handle non-admin routes
    if (!location.pathname.startsWith("/admin") && !href.startsWith("/admin")) {
      return location.pathname.startsWith(href) && href !== "/";
    }

    return false;
  };

  return (
    <div className={cn("pb-4", className)}>
      {showTitle && title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-sidebar-foreground uppercase tracking-wider px-2">
            {title}
          </h3>
        </div>
      )}

      <ul className="space-y-1" role="menu">
        {items.map((item, index) => {
          const isItemActive = isActive(item.href);
          const isLoading = loadingItems.includes(item.href);
          const isSubNavExpanded = expandedSubNavs[index] ?? isItemActive;

          if (item.subNav) {
            return (
              <li key={index} role="none">
                <div
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-sidebar-foreground flex items-center space-x-3 mb-1 mt-2"
                  )}
                >
                  <span className="flex items-center space-x-3">
                    {item.icon}
                    <span className="flex-1 truncate">{item.title}</span>
                  </span>
                </div>
                <div className="pl-0">
                  <NavSection
                    title=""
                    items={item.subNav}
                    onItemClick={onItemClick}
                    showTitle={false}
                  />
                </div>
              </li>
            );
          }

          return (
            <li key={index} role="none">
              <button
                onClick={() => handleNavigation(item.href)}
                onKeyDown={(e) => handleKeyDown(e, item.href)}
                onMouseEnter={() => prefetchRoute(item.href)}
                onMouseLeave={cancelPrefetch}
                disabled={isLoading}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1",
                  isItemActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg font-semibold ring-1 ring-sidebar-primary/50"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-foreground",
                  isLoading && "opacity-60 cursor-wait"
                )}
                role="menuitem"
                aria-current={isItemActive ? "page" : undefined}
                tabIndex={0}
              >
                <span className={cn(
                  "flex items-center shrink-0 transition-colors",
                  isItemActive ? "text-sidebar-primary-foreground" : ""
                )}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : item.icon}
                </span>
                <span className="flex-1 truncate">{item.title}</span>
                {isItemActive && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-5 bg-sidebar-primary-foreground rounded-r-full" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default NavSection;
