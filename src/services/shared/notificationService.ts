/**
 * Notification Service
 * Handles notification and settings CRUD operations
 */

import { supabase } from "@/integrations/supabase/client";
import { callRPC } from "@/lib/supabase/typedRPC";
import type { NotificationSettings, PriceAlert } from "@/types/domains";
import { toNotifications, type Notification } from "@/lib/typeAdapters";

async function getMyNotifications(
  limit = 50,
  offset = 0
): Promise<{ data: Notification[]; count: number }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { data: [], count: 0 };

  const { data, error } = await callRPC("get_paged_notifications", {
    p_user_id: userData.user.id,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total_data = data as any[];
  const totalCount = total_data?.[0]?.total_count || 0;
  return {
    data: toNotifications(total_data || []),
    count: Number(totalCount),
  };
}

async function getNotificationsForUser(userId: string, limit = 50): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, priority, read_at, data_jsonb, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return toNotifications(data || []);
}

async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) throw error;
}

async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);

  if (error) throw error;
}

async function markAllAsRead(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userData.user.id)
    .is("read_at", null);

  if (error) throw error;
}

async function getUnreadCount(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userData.user.id)
    .is("read_at", null);

  if (error) throw error;
  return count || 0;
}

async function getSettings(_userId: string): Promise<NotificationSettings | null> {
  return null;
}

async function createDefaultSettings(_userId: string): Promise<NotificationSettings> {
  throw new Error("notification_settings table has been removed");
}

async function updateSettings(
  _userId: string,
  _updates: Partial<NotificationSettings>
): Promise<void> {
  // notification_settings table was dropped - no-op
}

async function getPriceAlerts(_userId: string): Promise<PriceAlert[]> {
  return [];
}

async function createPriceAlert(
  _userId: string,
  _alert: Omit<PriceAlert, "id" | "created_at" | "updated_at">
): Promise<PriceAlert> {
  throw new Error("price_alerts table has been removed");
}

async function updatePriceAlert(_alertId: string, _updates: Partial<PriceAlert>): Promise<void> {
  throw new Error("price_alerts table has been removed");
}

async function deletePriceAlert(_alertId: string): Promise<void> {
  throw new Error("price_alerts table has been removed");
}

export const notificationService = {
  getMyNotifications,
  getNotificationsForUser,
  markAsRead,
  deleteNotification,
  markAllAsRead,
  getUnreadCount,
  getSettings,
  createDefaultSettings,
  updateSettings,
  getPriceAlerts,
  createPriceAlert,
  updatePriceAlert,
  deletePriceAlert,
};

// Re-export Notification type for backwards compatibility
export type { Notification } from "@/lib/typeAdapters";
