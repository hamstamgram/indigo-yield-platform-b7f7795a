import { createContext, useContext } from "react";
import { useNotifications } from "@/hooks";
import type { Notification } from "@/lib/typeAdapters/notificationAdapter";
import type { NotificationSettings } from "@/types/domains";

interface NotificationContextType {
  notifications: Notification[];
  settings: NotificationSettings | null;
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string;
}) {
  const notificationData = useNotifications(userId);

  return (
    <NotificationContext.Provider value={notificationData}>{children}</NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotificationContext must be used within a NotificationProvider");
  }
  return context;
}
