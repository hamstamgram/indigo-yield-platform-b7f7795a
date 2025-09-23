import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { adminServiceV2 } from '@/services/adminServiceV2';

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalPortfolioValue: number;
  totalTransactions: number;
  newUsersThisMonth: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

interface AdminState {
  metrics: AdminMetrics | null;
  loading: boolean;
  error: string | null;
}

export function useAdminData() {
  const { user, isAdmin } = useAuth();
  const [state, setState] = useState<AdminState>({
    metrics: null,
    loading: true,
    error: null
  });

  const fetchAdminData = async () => {
    if (!user || !isAdmin) {
      setState({
        metrics: null,
        loading: false,
        error: 'Access denied'
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await adminServiceV2.getDashboardStats();
      
      // Transform the data to match our interface
      const metrics: AdminMetrics = {
        totalUsers: result.investorCount || 0,
        activeUsers: result.investorCount || 0,
        totalPortfolioValue: result.totalAum || 0,
        totalTransactions: 0,
        newUsersThisMonth: 0,
        systemHealth: 'good'
      };

      setState({
        metrics,
        loading: false,
        error: null
      });
    } catch (error) {
      setState({
        metrics: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch admin data'
      });
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user, isAdmin]);

  const refresh = () => {
    fetchAdminData();
  };

  return {
    ...state,
    refresh
  };
}