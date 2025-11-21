import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";

export interface SystemStatusItem {
  name: string;
  status: "operational" | "degraded" | "down" | "maintenance";
  uptime?: number | null;
  lastChecked?: Date;
  message?: string;
  responseTime?: number;
}

interface SystemStatusProps {
  systems: SystemStatusItem[];
}

export function SystemStatus({ systems }: SystemStatusProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "degraded":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "down":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "maintenance":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      operational: "default",
      degraded: "secondary",
      down: "destructive",
      maintenance: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const overallStatus = systems.every((s) => s.status === "operational")
    ? "operational"
    : systems.some((s) => s.status === "down")
      ? "down"
      : "degraded";

  const averageUptime = systems.reduce((sum, s) => sum + (s.uptime || 0), 0) / systems.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current operational status</CardDescription>
          </div>
          {getStatusBadge(overallStatus)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Uptime</span>
            <span className="font-medium">{averageUptime.toFixed(2)}%</span>
          </div>
          <Progress value={averageUptime} className="h-2" />
        </div>

        <div className="space-y-3 pt-2">
          {systems.map((system, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(system.status)}
                <div>
                  <p className="text-sm font-medium">{system.name}</p>
                  {system.message && (
                    <p className="text-xs text-muted-foreground">{system.message}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {system.uptime != null && (
                  <p className="text-sm font-medium">{system.uptime.toFixed(1)}%</p>
                )}
                {system.lastChecked && (
                  <p className="text-xs text-muted-foreground">
                    {system.lastChecked.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
