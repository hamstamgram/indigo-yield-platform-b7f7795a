import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/context";
import { portfolioApi, type PortfolioSummary } from "@/services/api/portfolioApi";

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
    error: null,
  });

  const fetchPortfolio = async () => {
    if (!user) return;

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const result = await portfolioApi.getPortfolioSummary(user.id);

      if (result.error) {
        throw new Error(result.error);
      }

      setState({
        data: result.data,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch portfolio data",
      });
    }
  };

  useEffect(() => {
    fetchPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refreshPortfolio = () => {
    fetchPortfolio();
  };

  return {
    ...state,
    refresh: refreshPortfolio,
  };
}
