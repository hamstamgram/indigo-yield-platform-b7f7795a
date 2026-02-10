/**
 * NotificationBell - Refactored to use useNotificationBell data hook
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Badge } from "@/components/ui";
import { Bell, BellRing } from "lucide-react";
import { useNotificationBell } from "@/hooks/data";

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const { unreadCount, loading } = useNotificationBell();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/notifications");
  };

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className={className} disabled>
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`relative ${className}`}
      onClick={handleClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      {unreadCount > 0 ? (
        <BellRing className="h-5 w-5 text-blue-400" />
      ) : (
        <Bell className="h-5 w-5" />
      )}

      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold animate-pulse"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

export default NotificationBell;
