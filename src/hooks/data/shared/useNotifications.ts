import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toNotification, toNotifications } from "@/lib/typeAdapters";
import type { Notification } from "@/lib/typeAdapters/notificationAdapter";
import type { NotificationSettings, PriceAlert } from "@/types/domains";
import { useToast } from "@/hooks";
import { notificationService } from "@/services/shared";
import { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { logError } from "@/lib/logger";

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch notifications via service layer
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const result = await notificationService.getNotificationsForUser(userId, 50);
      setNotifications(result);

      // Count unread
      const unread = result.filter((n) => !n.read_at).length;
      setUnreadCount(unread);
    } catch (error) {
      logError("useNotifications.fetchNotifications", error, { userId });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch settings via service layer
  const fetchSettings = useCallback(async () => {
    if (!userId) return;

    try {
      const existing = await notificationService.getSettings(userId);

      if (existing) {
        setSettings(existing);
      } else {
        // Create default settings if none exist
        try {
          const created = await notificationService.createDefaultSettings(userId);
          setSettings(created);
        } catch (createError) {
          logError("useNotifications.createDefaultSettings", createError, { userId });
        }
      }
    } catch (error) {
      logError("useNotifications.fetchSettings", error, { userId });
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logError("useNotifications.markAsRead", error, { notificationId });
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      await notificationService.markAllAsRead();

      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      logError("useNotifications.markAllAsRead", error, { userId });
    }
  }, [userId]);

  // Delete archive/notification functionality
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await notificationService.deleteNotification(notificationId);

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setUnreadCount((prev) => {
          const notification = notifications.find((n) => n.id === notificationId);
          return notification && !notification.read_at ? Math.max(0, prev - 1) : prev;
        });
      } catch (error) {
        logError("useNotifications.deleteNotification", error, { notificationId });
      }
    },
    [notifications]
  );

  // Update settings via service layer
  const updateSettings = useCallback(
    async (updates: Partial<NotificationSettings>) => {
      if (!userId) return;

      try {
        await notificationService.updateSettings(userId, updates);

        setSettings((prev) => (prev ? { ...prev, ...updates } : null));

        toast({
          title: "Settings updated",
          description: "Your notification preferences have been saved.",
        });
      } catch (error) {
        logError("useNotifications.updateSettings", error, { userId });
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
          const newNotification = toNotification(
            payload.new as Database["public"]["Tables"]["notifications"]["Row"]
          );
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
          const updatedNotification = toNotification(
            payload.new as Database["public"]["Tables"]["notifications"]["Row"]
          );
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["priceAlerts", userId];

  const { data: alerts = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => notificationService.getPriceAlerts(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });

  const createMutation = useMutation({
    mutationFn: (alert: Omit<PriceAlert, "id" | "created_at" | "updated_at">) =>
      notificationService.createPriceAlert(userId!, alert),
    onSuccess: (_, alert) => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Alert created",
        description: `Price alert for ${alert.asset_code} set successfully.`,
      });
    },
    onError: (error) => {
      logError("usePriceAlerts.createAlert", error, { userId });
      toast({
        title: "Error",
        description: "Failed to create price alert.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ alertId, updates }: { alertId: string; updates: Partial<PriceAlert> }) =>
      notificationService.updatePriceAlert(alertId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Alert updated",
        description: "Price alert updated successfully.",
      });
    },
    onError: (error, { alertId }) => {
      logError("usePriceAlerts.updateAlert", error, { alertId });
      toast({
        title: "Error",
        description: "Failed to update price alert.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (alertId: string) => notificationService.deletePriceAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Alert deleted",
        description: "Price alert removed successfully.",
      });
    },
    onError: (error, alertId) => {
      logError("usePriceAlerts.deleteAlert", error, { alertId });
      toast({
        title: "Error",
        description: "Failed to delete price alert.",
        variant: "destructive",
      });
    },
  });

  return {
    alerts,
    loading,
    createAlert: createMutation.mutateAsync,
    updateAlert: (alertId: string, updates: Partial<PriceAlert>) =>
      updateMutation.mutateAsync({ alertId, updates }),
    deleteAlert: deleteMutation.mutateAsync,
    refreshAlerts: () => queryClient.invalidateQueries({ queryKey }),
  };
}
