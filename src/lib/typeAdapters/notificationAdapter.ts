/**
 * Notification Type Adapters
 * Transform between Supabase notification types and application types
 */

import { Database } from '@/integrations/supabase/types';

type SupabaseNotification = Database['public']['Tables']['notifications']['Row'];

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | null;
  read_at: string | null;
  data_jsonb: Record<string, any> | null;
  created_at: string;
}

/**
 * Transform Supabase notification to application Notification
 */
export function toNotification(row: SupabaseNotification): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    priority: row.priority,
    read_at: row.read_at,
    data_jsonb: row.data_jsonb as Record<string, any> | null,
    created_at: row.created_at,
  };
}

/**
 * Transform multiple notifications
 */
export function toNotifications(rows: SupabaseNotification[]): Notification[] {
  return rows.map(toNotification);
}
