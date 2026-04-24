/**
 * Centralized Fund AUM Hook
 * Single source of truth for AUM data with real-time updates
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import type { Database } from "@/integrations/supabase/types";
import { toNum } from "@/utils/numeric";

export interface FundAUMData {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class: string;
  status: string;
  latest_aum: number;
  latest_aum_date: string | null;
  investor_count: number;
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
    status: fund.status,
    latest_aum: toNum(fund.total_aum),
    latest_aum_date: null, // We could derive this if needed, but keeping existing behavior
    investor_count: Number(fund.investor_count || 0),
  }));
}

export function useFundAUM() {
  const queryClient = useQueryClient();
  // Unique channel name per hook instance to avoid subscribe-after-subscribe races
  // in React StrictMode and fast re-mounts.
  const channelNameRef = useRef(`fund-aum-realtime-${Math.random().toString(36).slice(2)}`);

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
    let timeoutId: ReturnType<typeof setTimeout>;

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investor_positions",
        },
        () => {
          // Debounce refetch to avoid excessive queries on every position change
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      channel.unsubscribe();
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
