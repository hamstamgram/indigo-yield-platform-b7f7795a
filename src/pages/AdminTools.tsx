
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminToolsHeader from '@/components/admin/AdminToolsHeader';
import AdminToolsTabs from '@/components/admin/AdminToolsTabs';
import AdminPortfolios from '@/components/admin/AdminPortfolios';
import CreateTestUser from '@/components/admin/CreateTestUser';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useInvestors } from '@/hooks/useInvestors';

const AdminTools = () => {
  const navigate = useNavigate();
  const { investors, assets, loading, refetch } = useInvestors();

  // Ensure we have fresh data when this component loads
  useEffect(() => {
    console.log("AdminTools: Initial load, refreshing data");
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      <AdminToolsHeader />
      <AdminToolsTabs defaultTab="portfolios">
        <TabsContent value="portfolios" className="space-y-6">
          <AdminPortfolios 
            investors={investors} 
            assets={assets} 
            loading={loading} 
            onRefresh={refetch} 
          />
        </TabsContent>
        <TabsContent value="test-users" className="space-y-6">
          <CreateTestUser onUserCreated={refetch} />
        </TabsContent>
      </AdminToolsTabs>
    </div>
  );
};

export default AdminTools;
