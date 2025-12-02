import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import {
  getSystemHealth,
  getOverallStatus,
  type ServiceStatus,
} from "@/services/systemHealthService";

export default function SystemHealthPage() {
  const {
    data: health,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["system-health"],
    queryFn: getSystemHealth,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const overallStatus = health ? getOverallStatus(health) : "operational";

  const statusColors: Record<ServiceStatus, string> = {
    operational: "text-green-600 bg-green-100",
    degraded: "text-yellow-600 bg-yellow-100",
    down: "text-red-600 bg-red-100",
  };

  const statusIcons: Record<ServiceStatus, React.ReactNode> = {
    operational: <CheckCircle2 className="h-5 w-5" />,
    degraded: <AlertTriangle className="h-5 w-5" />,
    down: <XCircle className="h-5 w-5" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
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
    </div>
  );
}
