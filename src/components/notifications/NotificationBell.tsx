import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Notification } from '@/types/phase3Types';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUnreadCount();
    subscribeToNotifications();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const subscription = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const notification = payload.new as Notification;
        // If notification was marked as read and previously unread
        if (notification.read_at && !payload.old?.read_at) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        // If notification was marked as unread and previously read
        else if (!notification.read_at && payload.old?.read_at) {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleClick = () => {
    navigate('/notifications');
  };

  if (loading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        disabled
      >
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
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      {unreadCount > 0 ? (
        <BellRing className="h-5 w-5 text-blue-600" />
      ) : (
        <Bell className="h-5 w-5" />
      )}
      
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold animate-pulse"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

export default NotificationBell;
