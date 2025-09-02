import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, CheckCheck, Filter, Download, MessageCircle, TrendingUp, AlertCircle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Notification, NotificationType } from '@/types/phase3Types';
import { formatDistanceToNow } from 'date-fns';

// Notification icons mapping
const NOTIFICATION_ICONS: Record<NotificationType, React.ComponentType<{className?: string}>> = {
  deposit: Download,
  statement: MessageCircle,
  performance: TrendingUp,
  system: Settings,
  support: AlertCircle,
};

// Notification colors mapping
const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  deposit: 'text-green-600 bg-green-100',
  statement: 'text-blue-600 bg-blue-100',
  performance: 'text-purple-600 bg-purple-100',
  system: 'text-gray-600 bg-gray-100',
  support: 'text-orange-600 bg-orange-100',
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    subscribeToNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read_at).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    const { data: { user } } = supabase.auth.getUser();
    user.then(({ user }) => {
      if (!user) return;

      const subscription = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.body,
          });
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );

      setUnreadCount(0);

      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };

  const filteredNotifications = notifications.filter(notification =>
    selectedType === 'all' || notification.type === selectedType
  );

  const getNotificationIcon = (type: NotificationType) => {
    const IconComponent = NOTIFICATION_ICONS[type];
    return <IconComponent className="w-5 h-5" />;
  };

  const getTypeLabel = (type: NotificationType) => {
    const labels = {
      deposit: 'Deposit',
      statement: 'Statement',
      performance: 'Performance',
      system: 'System',
      support: 'Support',
    };
    return labels[type];
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Stay updated on your portfolio activity and important announcements
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as NotificationType | 'all')}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="deposit" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Deposits ({notifications.filter(n => n.type === 'deposit').length})
              </TabsTrigger>
              <TabsTrigger value="statement" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Statements ({notifications.filter(n => n.type === 'statement').length})
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Performance ({notifications.filter(n => n.type === 'performance').length})
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                System ({notifications.filter(n => n.type === 'system').length})
              </TabsTrigger>
              <TabsTrigger value="support" className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Support ({notifications.filter(n => n.type === 'support').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No notifications
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {selectedType === 'all' 
                    ? "You're all caught up! New notifications will appear here."
                    : `No ${getTypeLabel(selectedType as NotificationType).toLowerCase()} notifications yet.`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                !notification.read_at ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''
              }`}
              onClick={() => !notification.read_at && markAsRead(notification.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-full ${NOTIFICATION_COLORS[notification.type]}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${!notification.read_at ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read_at && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        <p className={`text-sm ${!notification.read_at ? 'text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                          {notification.body}
                        </p>
                        
                        {/* Metadata from data_jsonb */}
                        {notification.data_jsonb && Object.keys(notification.data_jsonb).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {Object.entries(notification.data_jsonb).map(([key, value]) => (
                              <span key={key} className="inline-block mr-4">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions and Timestamp */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(notification.type)}
                          </Badge>
                          {notification.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">
                              High Priority
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(notification.created_at)}
                        </div>

                        {!notification.read_at && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="text-xs"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Mark Read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More - if we had pagination */}
      {filteredNotifications.length >= 100 && (
        <div className="text-center">
          <Button variant="outline">
            Load More Notifications
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
