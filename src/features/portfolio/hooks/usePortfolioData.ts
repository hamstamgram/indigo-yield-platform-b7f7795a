// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { portfolioApi } from '@/services/api/portfolioApi';

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  gain_loss: number;
  gain_percent: number;
  asset_type: string;
  last_updated: string;
}

interface PortfolioSummary {
  total_value: number;
  total_gain: number;
  total_gain_percent: number;
  day_change: number;
  day_change_percent: number;
  positions: Position[];
}

interface PortfolioState {
  data: PortfolioSummary | null;
  loading: boolean;
  error: string | null;
}

export function usePortfolioData() {
  const { user } = useAuth();
  const [state, setState] = useState<PortfolioState>({
    data: null,
    loading: true,
    error: null
  });

  const fetchPortfolio = async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await portfolioApi.getPortfolioSummary(user.id);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setState({
        data: result.data,
        loading: false,
        error: null
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch portfolio data'
      });
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [user]);

  const refreshPortfolio = () => {
    fetchPortfolio();
  };

  return {
    ...state,
    refresh: refreshPortfolio
  };
}