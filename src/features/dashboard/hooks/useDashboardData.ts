import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/integrations/supabase/client";

interface DashboardData {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
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
    error: null,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Get investor ID from user
        const { data: investors } = await supabase
          .from("investors")
          .select("id")
          .eq("profile_id", user.id)
          .single();

        if (!investors) {
          setState({
            data: {
              totalValue: 0,
              totalGain: 0,
              totalGainPercent: 0,
              positions: [],
              recentTransactions: [],
              topPerformers: [],
            },
            loading: false,
            error: null,
          });
          return;
        }

        // Fetch investor positions
        const { data: positions } = await supabase
          .from("investor_positions")
          .select(
            `
            investor_id,
            fund_id,
            shares,
            cost_basis,
            current_value,
            realized_pnl,
            funds (*)
          `
          )
          .eq("investor_id", investors.id);

        const totalValue =
          positions?.reduce((sum, pos) => sum + Number(pos.current_value || 0), 0) || 0;
        const totalCost =
          positions?.reduce((sum, pos) => sum + Number(pos.cost_basis || 0), 0) || 0;
        const totalGain = totalValue - totalCost;
        const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

        // Fetch recent transactions
        const { data: transactions } = await supabase
          .from("investments")
          .select("*")
          .eq("investor_id", investors.id)
          .order("created_at", { ascending: false })
          .limit(5);

        setState({
          data: {
            totalValue,
            totalGain,
            totalGainPercent,
            positions: positions || [],
            recentTransactions: transactions || [],
            topPerformers: [],
          },
          loading: false,
          error: null,
        });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to fetch dashboard data",
        });
      }
    };

    fetchDashboardData();
  }, [user]);

  const refetch = () => {
    if (user) {
      setState((prev) => ({ ...prev, loading: true }));
      // Re-trigger useEffect
      const event = new CustomEvent("dashboard-refetch");
      window.dispatchEvent(event);
    }
  };

  return {
    ...state,
    refetch,
  };
}
