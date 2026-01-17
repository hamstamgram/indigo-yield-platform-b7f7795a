/**
 * Notification Service
 * Handles notification and settings CRUD operations
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
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
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return toNotifications(data || []);
  }

  /**
   * Get notifications for a specific user
   */
  async getNotificationsForUser(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
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
      .select("*", { count: "exact", head: true })
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
   */
  async getSettings(userId: string): Promise<NotificationSettings | null> {
    const { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as NotificationSettings | null;
  }

  /**
   * Create default notification settings
   */
  async createDefaultSettings(userId: string): Promise<NotificationSettings> {
    const defaultSettings = {
      user_id: userId,
      email_enabled: true,
      push_enabled: true,
      in_app_enabled: true,
      transaction_notifications: true,
      alert_notifications: true,
      system_notifications: true,
      security_notifications: true,
      document_notifications: true,
      support_notifications: true,
      yield_notifications: true,
      portfolio_notifications: true,
      email_frequency: "realtime",
    };

    const { data, error } = await supabase
      .from("notification_settings")
      .insert(defaultSettings)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as NotificationSettings;
  }

  /**
   * Update notification settings
   */
  async updateSettings(userId: string, updates: Partial<NotificationSettings>): Promise<void> {
    const { error } = await supabase
      .from("notification_settings")
      .update(updates)
      .eq("user_id", userId);

    if (error) throw error;
  }

  // ============================================
  // Price Alert Methods
  // ============================================

  /**
   * Get price alerts for a user
   */
  async getPriceAlerts(userId: string): Promise<PriceAlert[]> {
    const { data, error } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as PriceAlert[]) || [];
  }

  /**
   * Create a price alert
   */
  async createPriceAlert(
    userId: string,
    alert: Omit<PriceAlert, "id" | "created_at" | "updated_at">
  ): Promise<PriceAlert> {
    const { data, error } = await supabase
      .from("price_alerts")
      .insert({ ...alert, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as PriceAlert;
  }

  /**
   * Update a price alert
   */
  async updatePriceAlert(alertId: string, updates: Partial<PriceAlert>): Promise<void> {
    const { error } = await supabase.from("price_alerts").update(updates).eq("id", alertId);

    if (error) throw error;
  }

  /**
   * Delete a price alert
   */
  async deletePriceAlert(alertId: string): Promise<void> {
    const { error } = await db.delete("price_alerts", { column: "id", value: alertId });

    if (error) throw new Error(error.message);
  }
}

export const notificationService = new NotificationService();

// Re-export Notification type for backwards compatibility
export type { Notification } from "@/lib/typeAdapters";
