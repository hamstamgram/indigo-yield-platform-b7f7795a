
import React, { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AssetOverview from "@/components/admin/AssetOverview";
import YieldSourcesTable from "@/components/admin/YieldSourcesTable";
import { useAssetData } from "@/hooks/useAssetData";
import { useNavigate } from "react-router-dom";
import QuickLinks from "@/components/admin/QuickLinks";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useIsMobile } from "@/hooks/use-mobile";

const AdminDashboard = () => {
  const { loading, error, assetSummaries, yieldSources, userName, isAdmin } = useAssetData();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Only redirect if definitely not an admin after checks are complete
  useEffect(() => {
    if (!loading && isAdmin === false) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, isAdmin, navigate]);
  
  // Display loading state
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Display error if any
  if (error) {
    return (
      <div className="space-y-8">
        <div className={isMobile ? "px-2" : "flex justify-center"}>
          <AdminPageHeader userName={userName} />
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Page header - centered on desktop, full width on mobile */}
      <div className={isMobile ? "px-2" : "flex justify-center"}>
        <AdminPageHeader userName={userName} />
      </div>

      {/* Quick links section - only visible on larger screens */}
      {!isMobile && (
        <QuickLinks />
      )}

      {/* Asset summaries */}
      <AssetOverview 
        loading={loading} 
        assetSummaries={assetSummaries} 
      />
      
      {/* Yield sources table */}
      <YieldSourcesTable 
        loading={loading} 
        yieldSources={yieldSources} 
      />
    </div>
  );
};

export default AdminDashboard;
