/**
 * useRealtimeSubscription - Hook for subscribing to Supabase real-time changes
 * Centralizes real-time subscription logic
 */

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface SubscriptionConfig {
  channel: string;
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: () => void;
}

/**
 * Subscribe to real-time changes on a Supabase table
 */
export function useRealtimeSubscription(config: SubscriptionConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const {
      channel: channelName,
      table,
      filter,
      onInsert,
      onUpdate,
      onDelete,
      onChange,
    } = config;

    let channel = supabase.channel(channelName);

    const baseConfig = {
      event: "*" as const,
      schema: "public" as const,
      table,
      ...(filter ? { filter } : {}),
    };

    channel = channel.on(
      "postgres_changes",
      baseConfig,
      (payload: any) => {
        onChange?.();

        switch (payload.eventType) {
          case "INSERT":
            onInsert?.(payload);
            break;
          case "UPDATE":
            onUpdate?.(payload);
            break;
          case "DELETE":
            onDelete?.(payload);
            break;
        }
      }
    );

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [config.channel, config.table, config.filter]);

  return channelRef.current;
}

/**
 * Simple helper for ledger/transaction subscriptions
 */
export function useLedgerSubscription(
  investorId: string,
  onInvalidate: () => void
) {
  useEffect(() => {
    if (!investorId) return;

    const channel = supabase
      .channel(`ledger-${investorId}`)
      .on(
        "postgres_changes",
        {
          event: "*" as const,
          schema: "public" as const,
          table: "transactions_v2",
          filter: `investor_id=eq.${investorId}`,
        },
        () => {
          onInvalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [investorId, onInvalidate]);
}
