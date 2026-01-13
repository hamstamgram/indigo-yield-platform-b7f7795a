import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge,
} from "@/components/ui";
import { Bell, BellOff, Trash2 } from "lucide-react";
import { 
  useInvestorNotifications, 
  useMarkNotificationAsRead, 
  useDeleteNotification 
} from "@/hooks/data/investor";

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useInvestorNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const deleteMutation = useDeleteNotification();

  if (isLoading) {
    return <div className="p-6">Loading notifications...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with platform activities</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border rounded-lg ${
                  notification.read_at ? "bg-muted/50" : "bg-card"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{notification.title}</h3>
                      <Badge
                        variant={notification.priority === "high" ? "destructive" : "secondary"}
                      >
                        {notification.priority}
                      </Badge>
                      <Badge variant="outline">{notification.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!notification.read_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        <BellOff className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(notification.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {notifications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No notifications found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
