/**
 * Delivery Service
 * 
 * Encapsulates all Supabase operations for report delivery management.
 * This service handles:
 * - Fetching periods with statement counts
 * - Fetching delivery statistics
 * - Fetching delivery records with filters
 * - Queueing statement deliveries
 * - Sending via MailerSend
 * - Retry, cancel, and status operations
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  DeliveryRecord,
  DeliveryStats,
  DeliveryFilters,
  DeliveryMode,
  PeriodWithCount,
  QueueResult,
  SendResult,
  StatusRefreshResult,
  RequeueResult,
} from "@/types/domains/delivery";

/**
 * Raw period from statement_periods table
 */
interface Period {
  id: string;
  period_name: string;
  year: number;
  month: number;
}

export const deliveryService = {
  // ==================
  // QUERIES
  // ==================

  /**
   * Fetch all statement periods with their statement counts
   */
  async fetchPeriodsWithCounts(): Promise<PeriodWithCount[]> {
    const { data: periodsData, error: periodsError } = await supabase
      .from("statement_periods")
      .select("id, period_name, year, month")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (periodsError) throw periodsError;

    // Get statement counts for each period
    const periodsWithStatementCounts = await Promise.all(
      (periodsData || []).map(async (period: Period) => {
        const { count } = await supabase
          .from("generated_statements")
          .select("id", { count: "exact", head: true })
          .eq("period_id", period.id);
        return { ...period, statementCount: count || 0 };
      })
    );

    return periodsWithStatementCounts;
  },

  /**
   * Fetch delivery statistics for a period
   */
  async fetchDeliveryStats(periodId: string): Promise<DeliveryStats | null> {
    if (!periodId) return null;

    const { data, error } = await supabase.rpc("get_delivery_stats", {
      p_period_id: periodId,
    });

    if (error) throw error;
    return data as unknown as DeliveryStats;
  },

  /**
   * Fetch delivery records for a period with optional filters
   */
  async fetchDeliveries(
    periodId: string,
    filters: DeliveryFilters
  ): Promise<DeliveryRecord[]> {
    if (!periodId) return [];

    let query = supabase
      .from("statement_email_delivery")
      .select(`
        *,
        profiles:investor_id (first_name, last_name, email)
      `)
      .eq("period_id", periodId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (filters.statusFilter !== "all") {
      query = query.or(
        `status.eq.${filters.statusFilter},status.eq.${filters.statusFilter.toUpperCase()}`
      );
    }
    if (filters.channelFilter !== "all") {
      query = query.eq("channel", filters.channelFilter);
    }
    if (filters.deliveryModeFilter !== "all") {
      query = query.eq("delivery_mode", filters.deliveryModeFilter);
    }
    if (filters.searchQuery) {
      query = query.or(`recipient_email.ilike.%${filters.searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as DeliveryRecord[];
  },

  /**
   * Fetch queued delivery IDs for batch processing
   */
  async fetchQueuedDeliveryIds(periodId: string, limit = 25): Promise<string[]> {
    const { data, error } = await supabase
      .from("statement_email_delivery")
      .select("id")
      .eq("period_id", periodId)
      .or("status.eq.queued,status.eq.QUEUED")
      .limit(limit);

    if (error) throw error;
    return (data || []).map((d) => d.id);
  },

  // ==================
  // MUTATIONS
  // ==================

  /**
   * Queue statement deliveries for a period
   */
  async queueDeliveries(
    periodId: string,
    channel: string
  ): Promise<QueueResult> {
    const { data, error } = await supabase.rpc("queue_statement_deliveries", {
      p_period_id: periodId,
      p_channel: channel,
    });

    if (error) throw error;
    return data as unknown as QueueResult;
  },

  /**
   * Send a single delivery via MailerSend edge function
   */
  async sendViaMailerSend(
    deliveryId: string,
    deliveryMode: DeliveryMode
  ): Promise<SendResult> {
    const { data, error } = await supabase.functions.invoke(
      "send-report-mailersend",
      {
        body: { delivery_id: deliveryId, delivery_mode: deliveryMode },
      }
    );

    if (error) throw error;
    return data as SendResult;
  },

  /**
   * Retry a failed delivery (re-queue for sending)
   */
  async retryDelivery(deliveryId: string): Promise<void> {
    const { error } = await supabase.rpc("retry_delivery", {
      p_delivery_id: deliveryId,
    });

    if (error) throw error;
  },

  /**
   * Cancel a delivery
   */
  async cancelDelivery(deliveryId: string): Promise<void> {
    const { error } = await supabase.rpc("cancel_delivery", {
      p_delivery_id: deliveryId,
    });

    if (error) throw error;
  },

  /**
   * Mark a delivery as sent manually
   */
  async markSentManually(deliveryId: string, note: string): Promise<void> {
    const { error } = await supabase.rpc("mark_sent_manually", {
      p_delivery_id: deliveryId,
      p_note: note,
    });

    if (error) throw error;
  },

  /**
   * Refresh delivery status from provider
   */
  async refreshDeliveryStatus(deliveryId: string): Promise<StatusRefreshResult> {
    const { data, error } = await supabase.functions.invoke(
      "refresh-delivery-status",
      {
        body: { delivery_id: deliveryId },
      }
    );

    if (error) throw error;
    return data as StatusRefreshResult;
  },

  /**
   * Requeue stuck "sending" deliveries
   */
  async requeueStaleSending(
    periodId: string,
    minutes: number
  ): Promise<RequeueResult> {
    const { data, error } = await supabase.rpc("requeue_stale_sending", {
      p_period_id: periodId,
      p_minutes: minutes,
    });

    if (error) throw error;
    return data as unknown as RequeueResult;
  },
};

export default deliveryService;
