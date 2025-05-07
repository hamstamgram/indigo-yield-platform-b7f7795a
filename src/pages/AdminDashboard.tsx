
import React from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AssetOverview from "@/components/admin/AssetOverview";
import YieldSourcesTable from "@/components/admin/YieldSourcesTable";
import QuickLinks from "@/components/admin/QuickLinks";
import { useAssetData } from "@/hooks/useAssetData";

const AdminDashboard = () => {
  const { loading, assetSummaries, yieldSources, userName } = useAssetData();
  
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
