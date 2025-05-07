
import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import AdminToolsTabs from "@/components/admin/AdminToolsTabs";
import AdminToolsHeader from "@/components/admin/AdminToolsHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import AdminYieldRates from "@/components/admin/AdminYieldRates";
import AdminPortfolios from "@/components/admin/AdminPortfolios";
import AdminInvites from "@/components/admin/AdminInvites";

const AdminTools = () => {
  const [initializing, setInitializing] = useState(true);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const defaultTab = searchParams.get("tab") || "portfolios";
  
  // Determine if we should show just the specific component without header and tabs
  const directAccess = location.search.includes('tab=') && !location.search.includes('showTabs=true');

  // Simplified initialization
  useEffect(() => {
    // Just check if the component is ready to render
    setInitializing(false);
  }, []);

  // Show loading state while initializing
  if (initializing) {
    return <LoadingSpinner />;
  }

  // Direct access to specific admin components
  if (directAccess) {
    switch(defaultTab) {
      case "yields":
        return <AdminYieldRates />;
      case "portfolios":
        return <AdminPortfolios />;
      case "invites":
        return <AdminInvites />;
      default:
        return <AdminPortfolios />;
    }
  }

  // Regular admin tools page with header and tabs
  return (
    <div className="space-y-6">
      <AdminToolsHeader />
      <AdminToolsTabs defaultTab={defaultTab} />
    </div>
  );
};

export default AdminTools;
