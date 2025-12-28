/**
 * Recent Activity Feed
 * Real-time stream of platform events
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  UserPlus,
  FileText,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "deposit" | "withdrawal" | "yield" | "user" | "report" | "transaction";
  title: string;
  description: string;
  timestamp: Date;
  metadata?: {
    amount?: number;
    asset?: string;
    investorName?: string;
  };
}

export function RecentActivityFeed() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = async () => {
    try {
      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from("transactions_v2")
        .select(`
          id,
          type,
          amount,
          asset,
          created_at,
          profile:profiles!fk_transactions_v2_profile(first_name, last_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch recent withdrawal requests
      const { data: withdrawals } = await supabase
        .from("withdrawal_requests")
        .select(`
          id,
          requested_amount,
          status,
          created_at,
          profile:profiles!fk_withdrawal_requests_profile(first_name, last_name, email),
          fund:funds(asset)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      const activityItems: ActivityItem[] = [];

      // Map transactions
      transactions?.forEach((t: any) => {
        const investorName = t.profile
          ? `${t.profile.first_name || ""} ${t.profile.last_name || ""}`.trim() || t.profile.email
          : "Unknown";

        let type: ActivityItem["type"] = "transaction";
        let title = "Transaction";

        // Compare uppercase since DB stores uppercase types
        const txType = (t.type || "").toUpperCase();
        if (txType === "DEPOSIT" || txType === "ADDITION") {
          type = "deposit";
          title = "Deposit";
        } else if (txType === "WITHDRAWAL") {
          type = "withdrawal";
          title = "Withdrawal";
        } else if (txType === "YIELD" || txType === "INCOME" || txType === "INTEREST") {
          type = "yield";
          title = "Yield Applied";
        }

        activityItems.push({
          id: t.id,
          type,
          title,
          description: investorName,
          timestamp: new Date(t.created_at),
          metadata: {
            amount: t.amount,
            asset: t.asset,
            investorName,
          },
        });
      });

      // Map withdrawal requests
      withdrawals?.forEach((w: any) => {
        const investorName = w.profile
          ? `${w.profile.first_name || ""} ${w.profile.last_name || ""}`.trim() || w.profile.email
          : "Unknown";

        activityItems.push({
          id: `wr-${w.id}`,
          type: "withdrawal",
          title: `Withdrawal ${w.status === "pending" ? "Requested" : w.status}`,
          description: investorName,
          timestamp: new Date(w.created_at),
          metadata: {
            amount: w.requested_amount,
            asset: w.fund?.asset,
            investorName,
          },
        });
      });

      // Sort by timestamp and take top 15
      activityItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(activityItems.slice(0, 15));
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions_v2" },
        () => fetchActivities()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawal_requests" },
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
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
