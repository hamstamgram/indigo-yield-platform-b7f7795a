/**
 * Notification Service
 * Handles notification CRUD operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  priority: string | null;
  read_at: string | null;
  created_at: string;
}

class NotificationService {
  /**
   * Get notifications for the current user
   */
  async getMyNotifications(): Promise<Notification[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, type, priority, read_at, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Notification[];
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
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

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
}

export const notificationService = new NotificationService();
