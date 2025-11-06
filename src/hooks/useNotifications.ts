import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toNotification, toNotifications } from "@/lib/typeAdapters";
import type { Notification } from "@/lib/typeAdapters/notificationAdapter";
import type { NotificationSettings, PriceAlert } from "@/types/notifications";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      const notifications = toNotifications(data || []);
      setNotifications(notifications);

      // Count unread
      const unread = notifications.filter((n) => !n.read_at).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .is("read_at", null);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }, [userId]);

  // Delete archive/notification functionality (notifications table doesn't have archived_at)
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.read_at ? Math.max(0, prev - 1) : prev;
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }, [notifications]);

  // Update settings
  const updateSettings = useCallback(
    async (updates: Partial<NotificationSettings>) => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("notification_settings")
          .upsert({
            user_id: userId,
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(data);

        toast({
          title: "Settings updated",
          description: "Your notification preferences have been saved.",
        });
      } catch (error) {
        console.error("Error updating notification settings:", error);
        toast({
          title: "Error",
          description: "Failed to update notification settings.",
          variant: "destructive",
        });
      }
    },
    [userId, toast]
  );

  // Setup real-time subscription
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();
    fetchSettings();

    // Subscribe to real-time notifications
    const channel: RealtimeChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = toNotification(payload.new as any);
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show toast for high priority notifications
          if (newNotification.priority === "high") {
            toast({
              title: newNotification.title,
              description: newNotification.body,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotification = toNotification(payload.new as any);
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications, fetchSettings, toast]);

  return {
    notifications,
    settings,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    refreshNotifications: fetchNotifications,
  };
}

export function usePriceAlerts(userId?: string) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error fetching price alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createAlert = useCallback(
    async (alert: Omit<PriceAlert, "id" | "created_at" | "updated_at">) => {
      try {
        const { data, error } = await supabase.from("price_alerts").insert(alert).select().single();

        if (error) throw error;
        setAlerts((prev) => [data, ...prev]);
        return data;
      } catch (error) {
        console.error("Error creating price alert:", error);
        throw error;
      }
    },
    []
  );

  const updateAlert = useCallback(async (alertId: string, updates: Partial<PriceAlert>) => {
    try {
      const { data, error } = await supabase
        .from("price_alerts")
        .update(updates)
        .eq("id", alertId)
        .select()
        .single();

      if (error) throw error;
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? data : a)));
      return data;
    } catch (error) {
      console.error("Error updating price alert:", error);
      throw error;
    }
  }, []);

  const deleteAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase.from("price_alerts").delete().eq("id", alertId);

      if (error) throw error;
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error("Error deleting price alert:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts: fetchAlerts,
  };
}
