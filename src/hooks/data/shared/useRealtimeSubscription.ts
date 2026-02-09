/**
 * useRealtimeSubscription - Hook for subscribing to Supabase real-time changes
 * Centralizes real-time subscription logic
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

interface SubscriptionConfig {
  channel?: string;
  table: string;
  event?: string;
  filter?: string;
  onInsert?: (payload?: RealtimePayload) => void;
  onUpdate?: (payload?: RealtimePayload) => void;
  onDelete?: (payload?: RealtimePayload) => void;
  onChange?: () => void;
}

/**
 * Subscribe to real-time changes on a Supabase table
 * Uses refs for callbacks to avoid stale closure issues
 */
export function useRealtimeSubscription(config: SubscriptionConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Store callbacks in refs to avoid stale closures
  const onInsertRef = useRef(config.onInsert);
  const onUpdateRef = useRef(config.onUpdate);
  const onDeleteRef = useRef(config.onDelete);
  const onChangeRef = useRef(config.onChange);

  // Update refs when callbacks change
  useEffect(() => {
    onInsertRef.current = config.onInsert;
    onUpdateRef.current = config.onUpdate;
    onDeleteRef.current = config.onDelete;
    onChangeRef.current = config.onChange;
  }, [config.onInsert, config.onUpdate, config.onDelete, config.onChange]);

  useEffect(() => {
    const { channel: channelName, table, filter } = config;

    const finalChannelName = channelName || `${table}-${Date.now()}`;

    const channel = supabase
      .channel(finalChannelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: RealtimePayload) => {
          // Use refs to always call the latest callback
          onChangeRef.current?.();

          switch (payload.eventType) {
            case "INSERT":
              onInsertRef.current?.(payload);
              break;
            case "UPDATE":
              onUpdateRef.current?.(payload);
              break;
            case "DELETE":
              onDeleteRef.current?.(payload);
              break;
          }
        }
      )
      .subscribe();

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
export function useLedgerSubscription(investorId: string, onInvalidate: () => void) {
  useEffect(() => {
    if (!investorId) return;

    const channel = supabase
      .channel(`ledger-${investorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
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
