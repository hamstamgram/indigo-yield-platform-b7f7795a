
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AdminToolsTabs from "@/components/admin/AdminToolsTabs";
import AdminToolsHeader from "@/components/admin/AdminToolsHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const AdminTools = () => {
  const [initializing, setInitializing] = useState(true);
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "portfolios";

  // Simplified initialization - DashboardLayout now handles the auth check and redirection
  useEffect(() => {
    // Just check if the component is ready to render
    setInitializing(false);
  }, []);

  // Show loading state while initializing
  if (initializing) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <AdminToolsHeader />
      <AdminToolsTabs defaultTab={defaultTab} />
    </div>
  );
};

export default AdminTools;
