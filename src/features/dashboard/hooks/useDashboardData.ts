import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';

interface DashboardData {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  positions: any[];
  recentTransactions: any[];
  topPerformers: any[];
}

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}

export function useDashboardData() {
  const { user } = useAuth();
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // For regular users, show mock portfolio data
        const mockData = {
          totalValue: 10000,
          totalGain: 500,
          totalGainPercent: 5.0,
          dayChange: 50,
          dayChangePercent: 0.5,
          positions: [],
          recentTransactions: [],
          topPerformers: []
        };

        setState({
          data: mockData,
          loading: false,
          error: null
        });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
        });
      }
    };

    fetchDashboardData();
  }, [user]);

  const refetch = () => {
    if (user) {
      setState(prev => ({ ...prev, loading: true }));
      // Re-trigger useEffect
      const event = new CustomEvent('dashboard-refetch');
      window.dispatchEvent(event);
    }
  };

  return {
    ...state,
    refetch
  };
}