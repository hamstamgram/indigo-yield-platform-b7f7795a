import { NavItem } from "@/types/navigation";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
        initial[index] =
          location.pathname === item.href || location.pathname.startsWith(item.href + "/");
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
      // Use path segment boundary to avoid /admin/yield matching /admin/yield-distributions
      if (
        href !== "/admin" &&
        (location.pathname === href || location.pathname.startsWith(href + "/"))
      ) {
        return true;
      }
    }

    // Handle non-admin routes
    if (!location.pathname.startsWith("/admin") && !href.startsWith("/admin")) {
      // Base routes like /investor and /dashboard should only match exactly
      const exactMatchRoutes = ["/investor", "/dashboard"];
      if (exactMatchRoutes.includes(href)) {
        return location.pathname === href;
      }
      return (
        href !== "/" && (location.pathname === href || location.pathname.startsWith(href + "/"))
      );
    }

    return false;
  };

  return (
    <div className={cn("pb-1", className)}>
      {showTitle && title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
            {title}
          </h3>
        </div>
      )}

      <ul className="space-y-0.5" role="menu">
        {items.map((item, index) => {
          const isItemActive = isActive(item.href);
          const isLoading = loadingItems.includes(item.href);
          const isSubNavExpanded = expandedSubNavs[index] ?? isItemActive;

          if (item.subNav) {
            return (
              <li key={index} role="none">
                <button
                  onClick={() => {
                    const isExpanded = expandedSubNavs[index];
                    setExpandedSubNavs((prev) => ({ ...prev, [index]: !isExpanded }));
                    handleNavigation(item.href);
                  }}
                  className={cn(
                    "w-full text-left h-10 px-3 rounded-lg text-[13px] font-bold transition-all duration-150 flex items-center gap-2 mb-0.5 mt-1 cursor-pointer relative",
                    isItemActive
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/20 border-l-2 border-transparent"
                  )}
                  role="menuitem"
                >
                  <span className="flex items-center gap-2 flex-1">
                    {item.icon}
                    <span className="flex-1 truncate">{item.title}</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-150 shrink-0",
                      !isSubNavExpanded && "-rotate-90"
                    )}
                  />
                </button>
                {isSubNavExpanded && (
                  <div className="pl-0">
                    <NavSection
                      title=""
                      items={item.subNav}
                      onItemClick={onItemClick}
                      showTitle={false}
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
                onMouseEnter={() => prefetchRoute(item.href)}
                onMouseLeave={cancelPrefetch}
                disabled={isLoading}
                className={cn(
                  "w-full text-left h-10 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 flex items-center gap-2 group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 border-l-2",
                  isItemActive
                    ? "bg-primary/10 text-primary border-primary font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-foreground border-transparent",
                  isLoading && "opacity-60 cursor-wait"
                )}
                role="menuitem"
                aria-current={isItemActive ? "page" : undefined}
                tabIndex={0}
              >
                <span
                  className={cn(
                    "flex items-center shrink-0 transition-colors",
                    isItemActive ? "text-primary" : "text-sidebar-foreground/60"
                  )}
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : item.icon}
                </span>
                <span className="flex-1 truncate">{item.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default NavSection;
