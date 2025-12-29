/**
 * Operations Hub Service
 * Handles operations hub data and realtime subscriptions
 */

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// =====================================================
// TYPES
// =====================================================

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_user: string | null;
  created_at: string;
  meta: unknown;
  old_values: unknown;
  new_values: unknown;
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Fetch recent audit log entries
 */
export async function getRecentAuditLogs(limit: number = 10): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching audit logs:", error);
    throw error;
  }

  return data || [];
}

/**
 * Setup realtime channel for operations updates
 * Returns the channel so it can be cleaned up on unmount
 */
export function setupOperationsRealtimeChannel(
  onUpdate: () => void
): RealtimeChannel {
  const channel = supabase
    .channel("operations-updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "withdrawal_requests",
      },
      onUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "deposits",
      },
      onUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "investments",
      },
      onUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "transactions_v2",
      },
      onUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles",
      },
      onUpdate
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "investor_positions",
      },
      onUpdate
    )
    .subscribe();

  return channel;
}

/**
 * Remove a realtime channel
 */
export function removeOperationsChannel(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
