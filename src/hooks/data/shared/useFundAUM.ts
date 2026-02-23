/**
 * Centralized Fund AUM Hook
 * Single source of truth for AUM data with real-time updates
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import type { Database } from "@/integrations/supabase/types";

export interface FundAUMData {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class: string;
  inception_date: string | null;
  status: string;
  latest_aum: number;
  latest_aum_date: string | null;
  investor_count: number;
  logo_url: string | null;
}

const QUERY_KEY = ["fund-aum-unified"];

async function fetchFundsWithAUM(): Promise<FundAUMData[]> {
  const { data, error, success } = await rpc.callNoArgs("get_funds_with_aum");

  if (!success || error) {
    throw new Error(error?.userMessage || "Failed to fetch funds with AUM");
  }

  return (data || []).map((fund) => ({
    id: fund.fund_id,
    code: fund.fund_code,
    name: fund.fund_name,
    asset: fund.asset,
    fund_class: fund.fund_class,
    inception_date: fund.inception_date,
    status: fund.status,
    latest_aum: Number(fund.total_aum || 0),
    latest_aum_date: null, // We could derive this if needed, but keeping existing behavior
    investor_count: Number(fund.investor_count || 0),
    logo_url: fund.logo_url,
  }));
}

export function useFundAUM() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchFundsWithAUM,
    staleTime: 5000, // 5 seconds - Fortune 500: near real-time AUM updates
    refetchInterval: 15000, // Refetch every 15 seconds after yield ops
    retry: 3, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  };
}

// Export query key for external invalidation
export const FUND_AUM_QUERY_KEY = QUERY_KEY;
