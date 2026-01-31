/**
 * IB Realtime Invalidation Hook
 *
 * Subscribes to Supabase Realtime channels for IB-specific tables
 * and invalidates relevant React Query caches when changes are detected.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateAfterIBOperation } from "@/utils/cacheInvalidation";

export function useIBRealtimeInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const commissionChannel = supabase
      .channel(`ib-commissions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ib_commission_ledger",
          filter: `ib_user_id=eq.${userId}`,
        },
        () => invalidateAfterIBOperation(queryClient, userId)
      )
      .subscribe();

    const positionsChannel = supabase
      .channel(`ib-positions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investor_positions",
        },
        () => invalidateAfterIBOperation(queryClient, userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commissionChannel);
      supabase.removeChannel(positionsChannel);
    };
  }, [userId, queryClient]);
}
