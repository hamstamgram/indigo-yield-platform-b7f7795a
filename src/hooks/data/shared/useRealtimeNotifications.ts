import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

let realtimeNotificationsChannelCounter = 0;

interface RealtimeNotification {
  id: string;
  type: "withdrawal_update" | "yield_applied" | "investor_update";
  title: string;
  message: string;
  timestamp: Date;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  const channelIdRef = useRef(++realtimeNotificationsChannelCounter);

  useEffect(() => {
    const baseName = `rtn-${channelIdRef.current}`;

    // Subscribe to withdrawal requests updates
    const withdrawalChannel = supabase
      .channel(`${baseName}-withdrawal`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "withdrawal_requests",
        },
        (payload) => {
          const { old: oldRecord, new: newRecord } = payload;
          if (oldRecord.status !== newRecord.status) {
            const notification: RealtimeNotification = {
              id: `withdrawal-${newRecord.id}-${Date.now()}`,
              type: "withdrawal_update",
              title: "Withdrawal Status Updated",
              message: `Withdrawal request ${newRecord.status}`,
              timestamp: new Date(),
            };

            setNotifications((prev) => [notification, ...prev.slice(0, 19)]); // Keep only 20 notifications

            toast.info(notification.title, {
              description: notification.message,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to yield applications
    const yieldChannel = supabase
      .channel(`${baseName}-yield`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "daily_yield_applications",
        },
        (payload) => {
          const { new: newRecord } = payload;
          const notification: RealtimeNotification = {
            id: `yield-${newRecord.id}-${Date.now()}`,
            type: "yield_applied",
            title: "Yield Applied",
            message: `Daily yield applied to ${newRecord.asset_code} (${newRecord.investors_affected} investors)`,
            timestamp: new Date(),
          };

          setNotifications((prev) => [notification, ...prev.slice(0, 19)]);

          toast.success(notification.title, {
            description: notification.message,
          });
        }
      )
      .subscribe();

    // Subscribe to investor updates
    const investorChannel = supabase
      .channel(`${baseName}-investor`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "investors",
        },
        (payload) => {
          const { old: oldRecord, new: newRecord } = payload;
          if (oldRecord.status !== newRecord.status) {
            const notification: RealtimeNotification = {
              id: `investor-${newRecord.id}-${Date.now()}`,
              type: "investor_update",
              title: "Investor Status Updated",
              message: `Investor ${newRecord.name || newRecord.email} status changed to ${newRecord.status}`,
              timestamp: new Date(),
            };

            setNotifications((prev) => [notification, ...prev.slice(0, 19)]);

            toast.info(notification.title, {
              description: notification.message,
            });
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      withdrawalChannel.unsubscribe();
      supabase.removeChannel(withdrawalChannel);
      yieldChannel.unsubscribe();
      supabase.removeChannel(yieldChannel);
      investorChannel.unsubscribe();
      supabase.removeChannel(investorChannel);
    };
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    notifications,
    clearNotifications,
    removeNotification,
  };
}
