/**
 * ActivityFeed - Unified activity feed component
 *
 * Can be used in two modes:
 * 1. Self-fetching: Automatically fetches and subscribes to realtime updates
 * 2. Controlled: Receives activities as props for custom data sources
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
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
  LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ActivityItem as DashboardActivityItem } from "@/types/domains";

/**
 * Controlled activity item for external data sources
 */
export interface ControlledActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  status?: "success" | "pending" | "error" | "info";
  icon?: LucideIcon;
  user?: string;
  metadata?: {
    amount?: string;
    asset?: string;
  };
}

interface ActivityFeedBaseProps {
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
  /** Maximum height for scroll area */
  maxHeight?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show compact mode (no card wrapper) */
  compact?: boolean;
}

interface ControlledActivityFeedProps extends ActivityFeedBaseProps {
  /** Activities array (controlled mode) */
  activities: ControlledActivityItem[];
  /** Loading state */
  isLoading?: boolean;
  /** Refresh handler */
  onRefresh?: () => void;
}

interface SelfFetchingActivityFeedProps extends ActivityFeedBaseProps {
  /** Activities not provided - will self-fetch */
  activities?: never;
}

type ActivityFeedProps = ControlledActivityFeedProps | SelfFetchingActivityFeedProps;

// Type guard to check if props are controlled
function isControlled(props: ActivityFeedProps): props is ControlledActivityFeedProps {
  return "activities" in props && Array.isArray(props.activities);
}

/**
 * Get icon for activity type
 */
function getActivityIcon(type: string): LucideIcon {
  switch (type) {
    case "deposit":
      return ArrowDownCircle;
    case "withdrawal":
      return ArrowUpCircle;
    case "yield":
      return TrendingUp;
    case "user":
      return UserPlus;
    case "report":
      return FileText;
    default:
      return Activity;
  }
}

/**
 * Get icon color for activity type
 */
function getIconColor(type: string, status?: string): string {
  // Status-based colors take precedence
  if (status) {
    switch (status) {
      case "success":
        return "text-green-500";
      case "error":
        return "text-red-500";
      case "pending":
        return "text-amber-500";
      default:
        return "text-muted-foreground";
    }
  }

  // Type-based colors
  switch (type) {
    case "deposit":
      return "text-green-500";
    case "withdrawal":
      return "text-red-500";
    case "yield":
      return "text-blue-500";
    case "user":
      return "text-purple-500";
    case "report":
      return "text-amber-500";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Get badge variant for status
 */
function getStatusVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "success":
      return "default";
    case "pending":
      return "secondary";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Format amount with asset
 */
function formatAmount(amount?: string | number, asset?: string): string | null {
  if (amount === undefined || amount === null || amount === "") return null;
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return null;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(Math.abs(numAmount));
  return `${numAmount >= 0 ? "+" : "-"}${formatted} ${asset || ""}`;
}

/**
 * Activity item renderer
 */
function ActivityItemRow({ activity }: { activity: ControlledActivityItem }) {
  const Icon = activity.icon || getActivityIcon(activity.type);
  const iconColor = getIconColor(activity.type, activity.status);

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="mt-0.5 p-1.5 rounded-full bg-muted">
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{activity.title}</span>
          {activity.status && (
            <Badge variant={getStatusVariant(activity.status)} className="text-xs">
              {activity.status}
            </Badge>
          )}
          {activity.metadata?.amount && (
            <Badge
              variant={
                activity.type === "deposit" || activity.type === "yield" ? "default" : "secondary"
              }
              className="font-mono text-[10px] px-1.5"
            >
              {formatAmount(activity.metadata.amount, activity.metadata.asset)}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
        {activity.user && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>by {activity.user}</span>
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
      </span>
    </div>
  );
}

/**
 * Loading skeleton for activity items
 */
function ActivitySkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

/**
 * Empty state for no activities
 */
function ActivityEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
      <p className="text-xs text-muted-foreground">Activity will appear here as it happens</p>
    </div>
  );
}

/**
 * Unified Activity Feed Component
 */
import { useRecentActivities, useRealtimeSubscription } from "@/hooks/data";

/**
 * ActivityFeed - Unified activity feed component
 */
export function ActivityFeed(props: ActivityFeedProps) {
  if (isControlled(props)) {
    return <ControlledActivityFeedContent {...props} />;
  }
  return <SelfFetchingActivityFeedWrapper {...props} />;
}

function ControlledActivityFeedContent(props: ControlledActivityFeedProps) {
  const {
    title = "Recent Activity",
    description,
    maxHeight = "400px",
    className,
    compact = false,
    activities,
    isLoading = false,
    onRefresh,
  } = props;

  const [localRefreshing, setLocalRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setLocalRefreshing(true);
    await onRefresh();
    setLocalRefreshing(false);
  };

  const isRefreshing = localRefreshing;

  const content = (
    <>
      {isLoading ? (
        <ActivitySkeleton />
      ) : activities.length === 0 ? (
        <ActivityEmptyState />
      ) : (
        <ScrollArea className={cn("px-4")} style={{ maxHeight }}>
          <div className="space-y-1 pb-4">
            {activities.map((activity) => (
              <ActivityItemRow key={activity.id} activity={activity} />
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );

  if (compact) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">{content}</CardContent>
    </Card>
  );
}

function SelfFetchingActivityFeedWrapper(props: SelfFetchingActivityFeedProps) {
  const { data: activities = [], isLoading, refetch } = useRecentActivities();
  const [refreshing, setRefreshing] = useState(false);

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

  // Transform dashboard activities to controlled format
  const controlledActivities: ControlledActivityItem[] = (
    activities as DashboardActivityItem[]
  ).map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    description: a.description,
    timestamp: a.timestamp,
    metadata: a.metadata,
  }));

  return (
    <ControlledActivityFeedContent
      {...props}
      activities={controlledActivities}
      isLoading={isLoading}
      onRefresh={handleRefresh}
    />
  );
}

export default ActivityFeed;
