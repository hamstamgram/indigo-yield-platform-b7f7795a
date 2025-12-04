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

      if (error) throw error;

      if (data) {
        setSettings(data as unknown as NotificationSettings);
      } else {
        // Create default settings if none exist
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

        const { data: newData, error: createError } = await (supabase as any)
          .from("notification_settings")
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) {
          console.error("Error creating default settings:", createError);
        } else {
          setSettings(newData as unknown as NotificationSettings);
        }
      }
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
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n))
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

      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }, [userId]);

  // Delete archive/notification functionality (notifications table doesn't have archived_at)
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        const { error } = await supabase.from("notifications").delete().eq("id", notificationId);

        if (error) throw error;

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setUnreadCount((prev) => {
          const notification = notifications.find((n) => n.id === notificationId);
          return notification && !notification.read_at ? Math.max(0, prev - 1) : prev;
        });
      } catch (error) {
        console.error("Error deleting notification:", error);
      }
    },
    [notifications]
  );

  // Update settings
  const updateSettings = useCallback(
    async (updates: Partial<NotificationSettings>) => {
      if (!userId) return;

      try {
        const { error } = await (supabase as any)
          .from("notification_settings")
          .update(updates)
          .eq("user_id", userId);

        if (error) throw error;

        setSettings((prev) => (prev ? { ...prev, ...updates } : null));

        toast({
          title: "Settings updated",
          description: "Your notification preferences have been saved.",
        });
      } catch (error) {
        console.error("Error updating settings:", error);
        toast({
          title: "Error",
          description: "Failed to update settings.",
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
    archiveNotification: deleteNotification, // Alias for compatibility
    deleteNotification,
    updateSettings,
    refreshNotifications: fetchNotifications,
  };
}

export function usePriceAlerts(userId?: string) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await (supabase as any)
        .from("price_alerts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts((data as unknown as PriceAlert[]) || []);
    } catch (error) {
      console.error("Error fetching price alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const createAlert = useCallback(
    async (alert: Omit<PriceAlert, "id" | "created_at" | "updated_at">) => {
      if (!userId) return;

      try {
        const { data, error } = await (supabase as any)
          .from("price_alerts")
          .insert({ ...alert, user_id: userId })
          .select()
          .single();

        if (error) throw error;

        setAlerts((prev) => [data as unknown as PriceAlert, ...prev]);
        toast({
          title: "Alert created",
          description: `Price alert for ${alert.asset_symbol} set successfully.`,
        });
      } catch (error) {
        console.error("Error creating price alert:", error);
        toast({
          title: "Error",
          description: "Failed to create price alert.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [userId, toast]
  );

  const updateAlert = useCallback(
    async (alertId: string, updates: Partial<PriceAlert>) => {
      try {
        const { error } = await (supabase as any)
          .from("price_alerts")
          .update(updates)
          .eq("id", alertId);

        if (error) throw error;

        setAlerts((prev) =>
          prev.map((alert) => (alert.id === alertId ? { ...alert, ...updates } : alert))
        );

        toast({
          title: "Alert updated",
          description: "Price alert updated successfully.",
        });
      } catch (error) {
        console.error("Error updating price alert:", error);
        toast({
          title: "Error",
          description: "Failed to update price alert.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast]
  );

  const deleteAlert = useCallback(
    async (alertId: string) => {
      try {
        const { error } = await (supabase as any).from("price_alerts").delete().eq("id", alertId);

        if (error) throw error;

        setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));

        toast({
          title: "Alert deleted",
          description: "Price alert removed successfully.",
        });
      } catch (error) {
        console.error("Error deleting price alert:", error);
        toast({
          title: "Error",
          description: "Failed to delete price alert.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast]
  );

  return {
    alerts,
    loading,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts: fetchAlerts,
  };
}
