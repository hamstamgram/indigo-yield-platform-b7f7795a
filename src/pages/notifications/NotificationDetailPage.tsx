// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Bell,
  Calendar,
  Tag,
  ExternalLink,
  Archive,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notifications';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const NotificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadNotification();
      markAsRead();
    }
  }, [id]);

  const loadNotification = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setNotification(data);
    } catch (error) {
      console.error('Error loading notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleArchive = async () => {
    try {
      await supabase
        .from('notifications')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .eq('id', id);

      toast({
        title: 'Archived',
        description: 'Notification has been archived.',
      });

      navigate('/notifications');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive notification.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      toast({
        title: 'Deleted',
        description: 'Notification has been deleted.',
      });

      navigate('/notifications');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete notification.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Notification not found</h3>
            <p className="text-muted-foreground text-center mb-4">
              This notification may have been deleted or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/notifications')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notifications
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/notifications')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Notifications
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                {notification.title}
                {notification.status === 'unread' && (
                  <Badge variant="default">New</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="outline">
                  {notification.type}
                </Badge>
                <Badge
                  variant={
                    notification.priority === 'urgent'
                      ? 'destructive'
                      : notification.priority === 'high'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {notification.priority} priority
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleArchive}
                title="Archive"
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDelete}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(notification.created_at), 'EEEE, MMMM d, yyyy • h:mm a')}
              </span>
            </div>

            {notification.read_at && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCheck className="h-4 w-4" />
                <span>
                  Read {format(new Date(notification.read_at), 'MMMM d, yyyy • h:mm a')}
                </span>
              </div>
            )}
          </div>

          <Separator />

          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold mb-2">Message</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {notification.message}
            </p>
          </div>

          {notification.metadata && Object.keys(notification.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Additional Details</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  {Object.entries(notification.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {notification.action_url && (
            <>
              <Separator />
              <div>
                <Button
                  onClick={() => navigate(notification.action_url!)}
                  className="gap-2"
                >
                  {notification.action_label || 'View Details'}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDetailPage;
