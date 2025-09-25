
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPortfolios from '@/components/admin/AdminPortfolios';
import { useInvestors } from '@/hooks/useInvestors';

const AdminTools = () => {
  const navigate = useNavigate();
  const { investors, assets, loading, refetch } = useInvestors();

  // Ensure we have fresh data when this component loads
  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Tools</h1>
      </div>
      <AdminPortfolios 
        investors={investors} 
        assets={assets} 
        loading={loading} 
        onRefresh={refetch} 
      />
    </div>
  );
};

export default AdminTools;
