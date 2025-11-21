import { NavItem } from "@/types/navigation";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  isExpanded = true,
  onToggle,
  className,
}: NavSectionProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingItems, setLoadingItems] = useState<string[]>([]);

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
          <h3 className="text-sm font-medium text-sidebar-foreground/70 uppercase tracking-wider px-2">
            {title}
          </h3>
          {onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-6 w-6 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${title} section`}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      )}

      {isExpanded && (
        <ul className="space-y-1" role="menu">
          {items.map((item, index) => {
            const isItemActive = isActive(item.href);
            const isLoading = loadingItems.includes(item.href);
            const [isSubNavExpanded, setIsSubNavExpanded] = useState(isItemActive);

            if (item.subNav) {
              return (
                <li key={index} role="none">
                  <button
                    onClick={() => setIsSubNavExpanded(!isSubNavExpanded)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between space-x-3 group focus:outline-none focus:ring-2 focus:ring-sidebar-ring",
                      isItemActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    aria-expanded={isSubNavExpanded}
                  >
                    <span className="flex items-center space-x-3">
                      {item.icon}
                      <span className="flex-1 truncate">{item.title}</span>
                    </span>
                    {isSubNavExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {isSubNavExpanded && (
                    <div className="pl-4 pt-2">
                      <NavSection
                        title=""
                        items={item.subNav}
                        onItemClick={onItemClick}
                        showTitle={false}
                        isExpanded={true}
                      />
                    </div>
                  )}
                </li>
              );
            }

            return (
              <li key={index} role="none">
                <button
                  onClick={() => handleNavigation(item.href)}
                  onKeyDown={(e) => handleKeyDown(e, item.href)}
                  disabled={isLoading}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 group relative focus:outline-none focus:ring-2 focus:ring-sidebar-ring",
                    isItemActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isLoading && "opacity-60 cursor-wait"
                  )}
                  role="menuitem"
                  aria-current={isItemActive ? "page" : undefined}
                  tabIndex={0}
                >
                  <span className="flex items-center shrink-0">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.title}</span>
                  {isItemActive && (
                    <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-sidebar-primary-foreground rounded-full opacity-60" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NavSection;
