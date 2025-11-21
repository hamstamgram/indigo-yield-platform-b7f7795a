import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeSubscriptionProps {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  onUpdate: () => void;
}

export function useRealtimeSubscription({
  table,
  event = "*",
  filter,
  onUpdate,
}: UseRealtimeSubscriptionProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create unique channel name
    const channelName = `${table}-${event}-${filter || "all"}`;

    // Remove existing subscription if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new subscription
    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        {
          event,
          schema: "public",
          table,
          ...(filter && { filter }),
        },
        (payload) => {
          console.log(`Real-time update for ${table}:`, payload);
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log(`Real-time subscription status for ${table}:`, status);
      });

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, onUpdate]);

  return channelRef.current;
}
