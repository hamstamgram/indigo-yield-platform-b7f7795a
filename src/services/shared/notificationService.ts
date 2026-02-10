/**
 * Notification Service
 * Handles notification and settings CRUD operations
 */

import { supabase } from "@/integrations/supabase/client";
import type { NotificationSettings, PriceAlert } from "@/types/domains";
import { toNotifications, type Notification } from "@/lib/typeAdapters";

class NotificationService {
  // ============================================
  // Notification Methods
  // ============================================

  /**
   * Get notifications for the current user
   */
  async getMyNotifications(): Promise<Notification[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, body, priority, read_at, data_jsonb, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;
    return toNotifications(data || []);
  }

  /**
   * Get notifications for a specific user
   */
  async getNotificationsForUser(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, body, priority, read_at, data_jsonb, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return toNotifications(data || []);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (error) throw error;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId);

    if (error) throw error;
  }

  /**
   * Mark all notifications as read for the current user
   */
  async markAllAsRead(): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userData.user.id)
      .is("read_at", null);

    if (error) throw error;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
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

  // ============================================
  // Settings Methods
  // ============================================

  /**
   * Get notification settings for a user
   * NOTE: notification_settings table was dropped - returns null
   */
  async getSettings(_userId: string): Promise<NotificationSettings | null> {
    return null;
  }

  /**
   * Create default notification settings
   * NOTE: notification_settings table was dropped
   */
  async createDefaultSettings(_userId: string): Promise<NotificationSettings> {
    throw new Error("notification_settings table has been removed");
  }

  /**
   * Update notification settings
   * NOTE: notification_settings table was dropped - no-op
   */
  async updateSettings(_userId: string, _updates: Partial<NotificationSettings>): Promise<void> {
    // notification_settings table was dropped - no-op
  }

  // ============================================
  // Price Alert Methods
  // ============================================

  /**
   * Get price alerts for a user
   * NOTE: price_alerts table was dropped - returns empty
   */
  async getPriceAlerts(_userId: string): Promise<PriceAlert[]> {
    return [];
  }

  /**
   * Create a price alert
   * NOTE: price_alerts table was dropped
   */
  async createPriceAlert(
    _userId: string,
    _alert: Omit<PriceAlert, "id" | "created_at" | "updated_at">
  ): Promise<PriceAlert> {
    throw new Error("price_alerts table has been removed");
  }

  /**
   * Update a price alert
   * NOTE: price_alerts table was dropped
   */
  async updatePriceAlert(_alertId: string, _updates: Partial<PriceAlert>): Promise<void> {
    throw new Error("price_alerts table has been removed");
  }

  /**
   * Delete a price alert
   * NOTE: price_alerts table was dropped
   */
  async deletePriceAlert(_alertId: string): Promise<void> {
    throw new Error("price_alerts table has been removed");
  }
}

export const notificationService = new NotificationService();

// Re-export Notification type for backwards compatibility
export type { Notification } from "@/lib/typeAdapters";
