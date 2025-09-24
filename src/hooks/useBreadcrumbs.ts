import { useLocation } from "react-router-dom";
import { useMemo } from "react";

export type BreadcrumbItem = {
  title: string;
  href?: string;
  isCurrentPage?: boolean;
};

const routeTitleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/statements": "Statements", 
  "/transactions": "Transactions",
  "/withdrawals": "Withdrawals",
  "/documents": "Documents",
  "/support": "Support",
  "/notifications": "Notifications",
  "/account": "Account",
  "/settings": "Settings",
  "/settings/profile": "Profile",
  "/settings/notifications": "Notification Settings",
  "/settings/security": "Security",
  "/settings/sessions": "Sessions",
  "/assets/btc": "Bitcoin",
  "/assets/eth": "Ethereum", 
  "/assets/sol": "Solana",
  "/assets/usdc": "USDC",
  "/admin": "Admin Dashboard",
  "/admin/investors": "Investor Management",
  "/admin/withdrawals": "Withdrawal Management",
  "/admin/yield-settings": "Yield Settings",
  "/admin/reports": "Reports & Analytics",
  "/admin/support-queue": "Support Queue",
  "/admin/requests": "User Requests",
  "/admin/documents": "Document Management",
  "/admin/portfolio": "Portfolio Management",
  "/admin/audit": "Audit Logs"
};

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  
  return useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Add home/dashboard
    if (location.pathname.startsWith('/admin')) {
      breadcrumbs.push({
        title: "Admin",
        href: "/admin"
      });
    } else {
      breadcrumbs.push({
        title: "Dashboard", 
        href: "/dashboard"
      });
    }
    
    // Build breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      // Skip the first segment if it's admin or already handled
      if (index === 0 && (segment === 'admin' || segment === 'dashboard')) {
        return;
      }
      
      const title = routeTitleMap[currentPath] || 
                   segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      
      breadcrumbs.push({
        title,
        href: isLast ? undefined : currentPath,
        isCurrentPage: isLast
      });
    });
    
    // If we're on a root page, mark it as current
    if (breadcrumbs.length === 1) {
      breadcrumbs[0].isCurrentPage = true;
      breadcrumbs[0].href = undefined;
    }
    
    return breadcrumbs;
  }, [location.pathname]);
}