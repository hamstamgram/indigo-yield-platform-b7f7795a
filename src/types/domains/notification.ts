/**
 * Notification Domain Types
 * Types for notifications and alerts
 */

export type NotificationType =
  | "transaction"
  | "alert"
  | "system"
  | "security"
  | "document"
  | "support"
  | "yield"
  | "portfolio"
  | "daily_rate"
  | "deposit"
  | "statement"
  | "performance";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export type NotificationStatus = "unread" | "read" | "archived";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  action_url?: string;
  action_label?: string;
  created_at: string;
  read_at?: string;
  archived_at?: string;
  // For backward compatibility with phase3Types
  body?: string;
  data_jsonb?: Record<string, any>;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  transaction_notifications: boolean;
  alert_notifications: boolean;
  system_notifications: boolean;
  security_notifications: boolean;
  document_notifications: boolean;
  support_notifications: boolean;
  yield_notifications: boolean;
  portfolio_notifications: boolean;
  email_frequency: "realtime" | "daily" | "weekly";
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: string;
  updated_at: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  asset_symbol: string;
  alert_type: "above" | "below" | "change_percent";
  threshold_value: number;
  current_value?: number;
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  type: NotificationType;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

// Support ticket types (merged from phase3Types)
export type TicketStatus = "open" | "in_progress" | "waiting_on_lp" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "account" | "portfolio" | "statement" | "technical" | "general";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  messages_jsonb: TicketMessage[];
  attachments: string[];
  assigned_admin_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  timestamp: string;
  is_admin: boolean;
}
