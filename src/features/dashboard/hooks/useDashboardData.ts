import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { portfolioApi } from '@/services/api/portfolioApi';
import { adminApi } from '@/services/api/adminApi';

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
  const { user, isAdmin } = useAuth();
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

        const [portfolioResult, transactionsResult] = await Promise.all([
          portfolioApi.getPortfolioSummary(user.id),
          portfolioApi.getRecentTransactions(user.id, 5)
        ]);

        if (portfolioResult.error) throw new Error(portfolioResult.error);
        if (transactionsResult.error) throw new Error(transactionsResult.error);

        const portfolioData = portfolioResult.data;
        const recentTransactions = transactionsResult.data || [];

        // Calculate top performers from positions
        const topPerformers = portfolioData?.positions
          ?.sort((a: any, b: any) => (b.gain_percent || 0) - (a.gain_percent || 0))
          ?.slice(0, 3) || [];

        setState({
          data: {
            totalValue: portfolioData?.total_value || 0,
            totalGain: portfolioData?.total_gain || 0,
            totalGainPercent: portfolioData?.total_gain_percent || 0,
            dayChange: portfolioData?.day_change || 0,
            dayChangePercent: portfolioData?.day_change_percent || 0,
            positions: portfolioData?.positions || [],
            recentTransactions,
            topPerformers
          },
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