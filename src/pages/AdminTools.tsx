
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminToolsHeader from '@/components/admin/AdminToolsHeader';
import AdminToolsTabs from '@/components/admin/AdminToolsTabs';
import AdminPortfolios from '@/components/admin/AdminPortfolios';
import CreateTestUser from '@/components/admin/CreateTestUser';
import { Tabs, TabsContent } from '@/components/ui/tabs';

const AdminTools = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <AdminToolsHeader />
      <AdminToolsTabs defaultTab="portfolios">
        <TabsContent value="portfolios" className="space-y-6">
          <AdminPortfolios />
        </TabsContent>
        <TabsContent value="test-users" className="space-y-6">
          <CreateTestUser />
        </TabsContent>
      </AdminToolsTabs>
    </div>
  );
};

export default AdminTools;
