/**
 * Delivery Domain Types
 *
 * Canonical type definitions for report/statement delivery tracking.
 * All delivery-related components and services should use these types.
 */

/**
 * Delivery status values
 */
export type DeliveryStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "bounced"
  | "complained"
  | "cancelled"
  | "skipped";

/**
 * Delivery mode options
 */
export type DeliveryMode = "email_html" | "pdf_attachment" | "link_only" | "hybrid";

/**
 * Delivery channel types
 */
export type DeliveryChannel = "email" | "download_link";

/**
 * Investor profile joined to delivery record
 */
export interface DeliveryProfile {
  first_name: string | null | undefined;
  last_name: string | null | undefined;
  email: string;
}

/**
 * A delivery record from statement_email_delivery table
 */
export interface DeliveryRecord {
  id: string;
  statement_id: string;
  investor_id: string;
  period_id: string;
  recipient_email: string;
  subject: string;
  status: string;
  channel: string;
  delivery_mode: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  error_code: string | null;
  provider_message_id: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  profiles?: DeliveryProfile;
}

/**
 * Delivery statistics for a period
 */
export interface DeliveryStats {
  total: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  cancelled: number;
  skipped: number;
  statements_generated: number;
  investors_in_scope: number;
  oldest_queued_at: string | null;
  stuck_sending: number;
}

/**
 * Statement period with statement count
 */
export interface PeriodWithCount {
  id: string;
  period_name: string;
  year: number;
  month: number;
  statementCount: number;
}

/**
 * Filters for querying deliveries
 */
export interface DeliveryFilters {
  statusFilter: string;
  channelFilter: string;
  deliveryModeFilter: string;
  searchQuery: string;
}

/**
 * Result from queue_statement_deliveries RPC
 */
export interface QueueResult {
  queued_count: number;
  skipped_missing_email: number;
  already_exists_count: number;
}

/**
 * Result from batch send operation
 */
export interface BatchSendResult {
  sent: number;
  failed: number;
  total: number;
  autoQueued?: boolean;
  queueResult?: QueueResult;
  reason?: string;
}

/**
 * Result from refresh-delivery-status edge function
 */
export interface StatusRefreshResult {
  status_changed: boolean;
  old_status: string;
  new_status: string;
}

/**
 * Result from send-report-mailersend edge function (Resend-backed)
 */
export interface SendResult {
  message_id: string;
  success: boolean;
}

/**
 * Result from requeue_stale_sending RPC
 */
export interface RequeueResult {
  requeued_count: number;
}

/**
 * Delivery mode option for UI display
 */
export interface DeliveryModeOption {
  value: DeliveryMode;
  label: string;
  description: string;
}

/**
 * Available delivery mode options
 */
export const DELIVERY_MODES: DeliveryModeOption[] = [
  { value: "email_html", label: "HTML Email", description: "Full report in email body" },
  { value: "link_only", label: "Link Only", description: "Email with link to view report" },
  { value: "hybrid", label: "HTML + Link", description: "Full report with view link" },
  { value: "pdf_attachment", label: "PDF Attachment", description: "Report as PDF attachment" },
];
