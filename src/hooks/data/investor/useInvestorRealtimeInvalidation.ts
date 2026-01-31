/**
 * Investor Realtime Invalidation Hook
 *
 * Subscribes to Supabase Realtime channels for investor-specific tables
 * and invalidates relevant React Query caches when changes are detected.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  invalidateAfterTransaction,
  invalidateAfterWithdrawal,
  invalidateInvestorData,
} from "@/utils/cacheInvalidation";

export function useInvestorRealtimeInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const transactionsChannel = supabase
      .channel(`investor-transactions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions_v2",
          filter: `investor_id=eq.${userId}`,
        },
        () => invalidateAfterTransaction(queryClient, userId)
      )
      .subscribe();

    const withdrawalsChannel = supabase
      .channel(`investor-withdrawals-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawal_requests",
          filter: `investor_id=eq.${userId}`,
        },
        () => invalidateAfterWithdrawal(queryClient, userId)
      )
      .subscribe();

    const positionsChannel = supabase
      .channel(`investor-positions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investor_positions",
          filter: `investor_id=eq.${userId}`,
        },
        () => invalidateInvestorData(queryClient, userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(withdrawalsChannel);
      supabase.removeChannel(positionsChannel);
    };
  }, [userId, queryClient]);
}
