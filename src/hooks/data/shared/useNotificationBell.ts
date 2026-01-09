/**
 * useNotificationBell - Lightweight hook for notification bell component
 * Provides unread count and real-time updates
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/services/auth";

export function useNotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error("Error loading unread count:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    loadUnreadCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`notifications-bell:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // If notification was marked as read
          if (payload.new?.read_at && !payload.old?.read_at) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          // If notification was marked as unread
          else if (!payload.new?.read_at && payload.old?.read_at) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadUnreadCount]);

  return {
    unreadCount,
    loading,
    refresh: loadUnreadCount,
  };
}
