import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton } from "@/components/ui";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Mail,
  RefreshCw,
  Shield,
  XCircle,
  Send,
  Clock,
  Inbox,
} from "lucide-react";
import { useSystemHealth, type ServiceStatus, useDeliveryQueueMetrics } from "@/hooks/data";
import { getOverallStatus } from "@/services/core/systemHealthService";
import { formatDistanceToNow } from "date-fns";
import { DataIntegrityPanel } from "@/features/admin/system/components/DataIntegrityPanel";
import { PageShell } from "@/components/layout/PageShell";

export default function SystemHealthPage() {
  const { data: health, isLoading, refetch } = useSystemHealth();

  const { data: deliveryMetrics } = useDeliveryQueueMetrics();

  const overallStatus = health ? getOverallStatus(health) : "operational";

  const statusColors: Record<ServiceStatus, string> = {
    operational: "text-emerald-400 bg-emerald-500/10",
    degraded: "text-yellow-400 bg-yellow-500/10",
    down: "text-rose-400 bg-rose-500/10",
  };

  const statusIcons: Record<ServiceStatus, React.ReactNode> = {
    operational: <CheckCircle2 className="h-5 w-5" />,
    degraded: <AlertTriangle className="h-5 w-5" />,
    down: <XCircle className="h-5 w-5" />,
  };

  const getDeliveryQueueStatus = (): ServiceStatus => {
    if (!deliveryMetrics) return "operational";
    if (deliveryMetrics.stuck_sending_count > 0 || deliveryMetrics.failed_last_24h > 5)
      return "degraded";
    return "operational";
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Monitor the health and performance of all services.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge className={`${statusColors[overallStatus]} text-sm px-3 py-1`}>
              {statusIcons[overallStatus]}
              <span className="ml-2 capitalize">{overallStatus}</span>
            </Badge>
            {health && (
              <span className="text-sm text-muted-foreground">
                Last checked: {health[0]?.lastChecked?.toLocaleTimeString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Queue Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Report Delivery Queue
            </span>
            <Badge className={statusColors[getDeliveryQueueStatus()]}>
              {statusIcons[getDeliveryQueueStatus()]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Inbox className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{deliveryMetrics?.queued_count ?? "-"}</p>
              <p className="text-xs text-muted-foreground">Queued</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Send className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{deliveryMetrics?.sending_count ?? "-"}</p>
              <p className="text-xs text-muted-foreground">Sending</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">
                {deliveryMetrics?.stuck_sending_count ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground">Stuck (&gt;15m)</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
              <p className="text-2xl font-bold text-destructive">
                {deliveryMetrics?.failed_last_24h ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground">Failed (24h)</p>
            </div>
          </div>
          {deliveryMetrics?.oldest_queued_at && (
            <p className="text-sm text-muted-foreground mb-4">
              Oldest queued:{" "}
              {formatDistanceToNow(new Date(deliveryMetrics.oldest_queued_at), { addSuffix: true })}
            </p>
          )}
          <Link to="/admin/reports/delivery">
            <Button variant="outline" size="sm" className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Open Delivery Center
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Data Integrity Panel */}
      <DataIntegrityPanel />

      {/* Service Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {health?.map((service) => (
            <Card key={service.name}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    {service.name === "Database" && <Database className="h-5 w-5" />}
                    {service.name === "Authentication" && <Shield className="h-5 w-5" />}
                    {service.name === "File Storage" && <HardDrive className="h-5 w-5" />}
                    {service.name === "Email Service" && <Mail className="h-5 w-5" />}
                    {service.name}
                  </span>
                  <Badge className={statusColors[service.status]}>
                    {statusIcons[service.status]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {service.uptime !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="font-medium">{service.uptime}%</span>
                    </div>
                  )}
                  {service.responseTime !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Response Time</span>
                      <span className="font-medium">{service.responseTime}ms</span>
                    </div>
                  )}
                  {service.message && (
                    <p className="text-sm text-muted-foreground mt-2">{service.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
