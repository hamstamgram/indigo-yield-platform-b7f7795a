/**
 * Centralized Fund AUM Hook
 * Single source of truth for AUM data with real-time updates
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FundAUMData {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class: string;
  inception_date: string;
  status: string;
  latest_aum: number;
  latest_aum_date: string | null;
  investor_count: number;
}

const QUERY_KEY = ["fund-aum-unified"];

async function fetchFundsWithAUM(): Promise<FundAUMData[]> {
  const { data, error } = await (supabase.rpc as any)("get_funds_with_aum");

  if (error) throw error;

  return (data || []).map((fund: any) => ({
    id: fund.id,
    code: fund.code,
    name: fund.name,
    asset: fund.asset,
    fund_class: fund.fund_class,
    inception_date: fund.inception_date,
    status: fund.status,
    latest_aum: Number(fund.latest_aum || 0),
    latest_aum_date: fund.latest_aum_date,
    investor_count: Number(fund.investor_count || 0),
  }));
}

export function useFundAUM() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchFundsWithAUM,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Real-time subscription to investor_positions changes
  useEffect(() => {
    const channel = supabase
      .channel("fund-aum-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investor_positions",
        },
        () => {
          // Debounce refetch to avoid excessive queries
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    funds: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  };
}

// Export query key for external invalidation
export const FUND_AUM_QUERY_KEY = QUERY_KEY;
