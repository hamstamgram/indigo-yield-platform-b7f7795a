import React, { useState, useEffect } from 'react';
import { adminServiceV2, type InvestorSummaryV2 } from '@/services/adminServiceV2';
import InvestorManagementTabs from './investor/InvestorManagementTabs';
import { toast } from 'sonner';

const InvestorManagementView = () => {
  const [investors, setInvestors] = useState<InvestorSummaryV2[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvestors = async () => {
    try {
      setLoading(true);
      const data = await adminServiceV2.getAllInvestorsWithSummary();
      setInvestors(data);
    } catch (error) {
      console.error('Error fetching investors:', error);
      toast.error('Failed to load investor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, []);

  const handleDataChange = () => {
    fetchInvestors();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading investors...</p>
        </div>
      </div>
    );
  }

  return (
    <InvestorManagementTabs 
      investors={investors} 
      onDataChange={handleDataChange} 
    />
  );
};

export default InvestorManagementView;