import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Search,
  Calendar,
  Filter,
  Download,
  FileText,
  DollarSign,
  Shield,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { NotificationType } from "@/types/notifications";

const NotificationHistoryPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { notifications, loading } = useNotifications(currentUser?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "transaction":
        return <DollarSign className="h-5 w-5" />;
      case "alert":
        return <AlertCircle className="h-5 w-5" />;
      case "document":
        return <FileText className="h-5 w-5" />;
      case "security":
        return <Shield className="h-5 w-5" />;
      case "yield":
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ((n as any).content || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((n) => n.type === typeFilter);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = startOfMonth(now);
          break;
        case "lastMonth":
          startDate = startOfMonth(subMonths(now, 1));
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((n) => new Date(n.created_at) >= startDate);
    }

    return filtered;
  };

  const filteredNotifications = filterNotifications();

  const groupByDate = () => {
    const grouped: Record<string, typeof filteredNotifications> = {};

    filteredNotifications.forEach((notification) => {
      const date = format(new Date(notification.created_at), "yyyy-MM-dd");
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(notification);
    });

    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const groupedNotifications = groupByDate();

  const handleExport = () => {
    const csvContent = [
      ["Date", "Type", "Priority", "Title", "Content", "Read"],
      ...filteredNotifications.map((n) => [
        format(new Date(n.created_at), "yyyy-MM-dd HH:mm:ss"),
        n.type,
        n.priority || "medium",
        n.title,
        (n as any).content || "",
        (n as any).read ? "read" : "unread",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notification-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Notification History
          </h1>
          <p className="text-muted-foreground mt-1">
            View and search your complete notification history
          </p>
        </div>

        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="transaction">Transactions</SelectItem>
                <SelectItem value="alert">Alerts</SelectItem>
                <SelectItem value="yield">Yield</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== "all" || dateRange !== "all"
                  ? "Try adjusting your filters"
                  : "You have no notification history yet"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-6">
                {groupedNotifications.map(([date, notifs]) => (
                  <div key={date} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground sticky top-0 bg-background py-2">
                      {format(new Date(date), "EEEE, MMMM d, yyyy")}
                    </h3>

                    {notifs.map((notification) => (
                      <Card key={notification.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="p-2 rounded-full bg-gray-100">
                              {getNotificationIcon(notification.type as NotificationType)}
                            </div>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold flex items-center gap-2">
                                    {notification.title}
                                    <Badge variant="outline" className="text-xs">
                                      {notification.type}
                                    </Badge>
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {(notification as any).content}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    notification.priority === "high" ? "default" : "secondary"
                                  }
                                >
                                  {notification.priority || "medium"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{format(new Date(notification.created_at), "h:mm a")}</span>
                                <span>•</span>
                                <span>
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                                <span>•</span>
                                <Badge
                                  variant={(notification as any).read ? "outline" : "default"}
                                  className="text-xs"
                                >
                                  {(notification as any).read ? "read" : "unread"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {filteredNotifications.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Showing {filteredNotifications.length} notification
                {filteredNotifications.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationHistoryPage;
