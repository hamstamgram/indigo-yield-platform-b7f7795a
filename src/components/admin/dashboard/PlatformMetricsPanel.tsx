import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Users, Briefcase, TrendingUp, ArrowDownToLine, Activity } from "lucide-react";
import { usePlatformMetrics } from "@/hooks/data/admin/useRiskAlerts";
import { formatDistanceToNow } from "date-fns";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

function MetricCard({ title, value, icon: Icon, subtitle }: MetricCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export function PlatformMetricsPanel() {
  const { data: metrics, isLoading } = usePlatformMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading platform metrics...
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No metrics available. Run: REFRESH MATERIALIZED VIEW mv_daily_platform_metrics;
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Platform Overview</CardTitle>
          </div>
          {metrics.refreshed_at && (
            <span className="text-xs text-muted-foreground">
              Updated{" "}
              {formatDistanceToNow(new Date(metrics.refreshed_at), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard
            title="Active Investors"
            value={metrics.active_investors?.toLocaleString() || 0}
            icon={Users}
          />
          <MetricCard
            title="IBs"
            value={metrics.total_ibs?.toLocaleString() || 0}
            icon={Briefcase}
          />
          <MetricCard
            title="Active Funds"
            value={metrics.active_funds?.toLocaleString() || 0}
            icon={TrendingUp}
          />
          <MetricCard
            title="Pending Withdrawals"
            value={metrics.pending_withdrawals?.toLocaleString() || 0}
            icon={ArrowDownToLine}
          />
          <MetricCard
            title="Yields Today"
            value={metrics.yields_today?.toLocaleString() || 0}
            icon={Activity}
          />
        </div>
      </CardContent>
    </Card>
  );
}
