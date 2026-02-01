/**
 * Email Tracking Service
 * Handles email statistics and delivery data operations
 */

import { supabase } from "@/integrations/supabase/client";
import { getTodayString } from "@/utils/dateUtils";
import { logError } from "@/lib/logger";

// =====================================================
// TYPES
// =====================================================

export interface EmailDelivery {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  channel: string;
  provider: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  error_code: string | null;
  bounce_type: string | null;
  created_at: string;
  investor_id: string;
}

export interface EmailFilters {
  search: string;
  status: "all" | "PENDING" | "SENT" | "DELIVERED" | "OPENED" | "CLICKED" | "BOUNCED" | "FAILED";
  dateFrom?: string;
  dateTo?: string;
}

export interface EmailStats {
  totalSent: number;
  delivered: number;
  opened: number;
  failed: number;
  bounced: number;
  successRate: number;
  todayCount: number;
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Fetch email statistics from statement_email_delivery
 * Accepts optional filters to match list query for consistent totals
 */
export async function getEmailStats(filters?: EmailFilters): Promise<EmailStats> {
  let query = supabase
    .from("statement_email_delivery")
    .select("status, sent_at, created_at, recipient_email, subject");

  // Apply same filters as getEmailDeliveries for consistency
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    query = query.or(`recipient_email.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
  }

  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    logError("emailTrackingService.getEmailStats", error);
    return {
      totalSent: 0,
      delivered: 0,
      opened: 0,
      failed: 0,
      bounced: 0,
      successRate: 0,
      todayCount: 0,
    };
  }

  const today = getTodayString();

  const stats: EmailStats = {
    totalSent: data?.length || 0,
    delivered: 0,
    opened: 0,
    failed: 0,
    bounced: 0,
    successRate: 0,
    todayCount: 0,
  };

  data?.forEach((log) => {
    if (log.status === "DELIVERED" || log.status === "SENT") stats.delivered++;
    if (log.status === "OPENED" || log.status === "CLICKED") stats.opened++;
    if (log.status === "FAILED") stats.failed++;
    if (log.status === "BOUNCED") stats.bounced++;
    const logDate = log.sent_at || log.created_at;
    if (logDate && logDate.startsWith(today)) stats.todayCount++;
  });

  stats.successRate =
    stats.totalSent > 0 ? Math.round((stats.delivered / stats.totalSent) * 100) : 0;

  return stats;
}

/**
 * Fetch email deliveries with filters
 */
export async function getEmailDeliveries(filters: EmailFilters): Promise<EmailDelivery[]> {
  let query = supabase
    .from("statement_email_delivery")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    query = query.or(`recipient_email.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    logError("emailTrackingService.getEmailDeliveries", error);
    return [];
  }

  return data || [];
}
