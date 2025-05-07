
import React, { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AssetOverview from "@/components/admin/AssetOverview";
import YieldSourcesTable from "@/components/admin/YieldSourcesTable";
import QuickLinks from "@/components/admin/QuickLinks";
import { useAssetData } from "@/hooks/useAssetData";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { loading, error, assetSummaries, yieldSources, userName, isAdmin } = useAssetData();
  const navigate = useNavigate();
  
  // If user is definitely not an admin after all checks, redirect them
  useEffect(() => {
    if (!loading && !isAdmin && !error) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, isAdmin, error, navigate]);
  
  // Display error if any
  if (error) {
    return (
      <div className="space-y-8">
        <AdminPageHeader userName={userName} />
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
      {/* Page header */}
      <AdminPageHeader userName={userName} />

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
      
      {/* Quick links */}
      <QuickLinks />
    </div>
  );
};

export default AdminDashboard;
