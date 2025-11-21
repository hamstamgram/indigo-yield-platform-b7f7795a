import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, DollarSign, Activity, UserPlus, Settings } from "lucide-react";

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalPortfolioValue: number;
  totalTransactions: number;
  newUsersThisMonth: number;
  systemHealth: "good" | "warning" | "critical";
}

interface AdminOverviewProps {
  metrics: AdminMetrics;
  loading?: boolean;
  onManageUsers?: () => void;
  onSystemSettings?: () => void;
  className?: string;
}

export function AdminOverview({
  metrics,
  loading = false,
  onManageUsers,
  onSystemSettings,
  className,
}: AdminOverviewProps) {
  const getHealthBadge = (health: AdminMetrics["systemHealth"]) => {
    const variants = {
      good: "default",
      warning: "secondary",
      critical: "destructive",
    } as const;

    const labels = {
      good: "Healthy",
      warning: "Warning",
      critical: "Critical",
    };

    return (
      <Badge variant={variants[health]} className="text-xs">
        {labels[health]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* System Health Alert */}
      <Card
        className={cn(
          "border-l-4",
          metrics.systemHealth === "good" && "border-l-green-500",
          metrics.systemHealth === "warning" && "border-l-yellow-500",
          metrics.systemHealth === "critical" && "border-l-red-500"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">System Status</CardTitle>
          <div className="flex items-center space-x-2">
            {getHealthBadge(metrics.systemHealth)}
            {onSystemSettings && (
              <Button variant="outline" size="sm" onClick={onSystemSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{metrics.activeUsers} active this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.totalPortfolioValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Across all users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newUsersThisMonth}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {onManageUsers && (
              <Button variant="outline" onClick={onManageUsers}>
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            )}
            {onSystemSettings && (
              <Button variant="outline" onClick={onSystemSettings}>
                <Settings className="h-4 w-4 mr-2" />
                System Settings
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
