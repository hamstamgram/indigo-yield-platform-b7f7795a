/**
 * Recent Activity Feed
 * Real-time stream of platform events
 */

import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Skeleton,
  ScrollArea,
} from "@/components/ui";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  UserPlus,
  FileText,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRecentActivities, useRealtimeSubscription } from "@/hooks/data";
import type { ActivityItem } from "@/types/domains";

export function RecentActivityFeed() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: activities = [], isLoading: loading, refetch } = useRecentActivities();

  // Subscribe to realtime changes
  useRealtimeSubscription({
    channel: "activity-feed",
    table: "transactions_v2",
    onChange: () => refetch(),
  });

  useRealtimeSubscription({
    channel: "activity-feed-withdrawals",
    table: "withdrawal_requests",
    onChange: () => refetch(),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "deposit":
        return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case "withdrawal":
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case "yield":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "user":
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case "report":
        return <FileText className="h-4 w-4 text-amber-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatAmount = (amount?: number, asset?: string) => {
    if (!amount) return null;
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(Math.abs(amount));
    return `${amount >= 0 ? "+" : "-"}${formatted} ${asset || ""}`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Recent Activity
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground">
              Activity will appear here as it happens
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] px-4">
            <div className="space-y-1 pb-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                    {getIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{activity.title}</span>
                      {activity.metadata?.amount && (
                        <Badge
                          variant={activity.type === "deposit" || activity.type === "yield" ? "default" : "secondary"}
                          className="font-mono text-[10px] px-1.5"
                        >
                          {formatAmount(activity.metadata.amount, activity.metadata.asset)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
