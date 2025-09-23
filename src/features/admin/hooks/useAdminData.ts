import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { adminApi } from '@/services/api/adminApi';

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
      
      const result = await adminApi.getDashboardMetrics();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Transform the data to match our interface
      const metrics: AdminMetrics = {
        totalUsers: result.data?.total_users || 0,
        activeUsers: result.data?.active_users || 0,
        totalPortfolioValue: result.data?.total_portfolio_value || 0,
        totalTransactions: result.data?.total_transactions || 0,
        newUsersThisMonth: result.data?.new_users_this_month || 0,
        systemHealth: result.data?.system_health || 'good'
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