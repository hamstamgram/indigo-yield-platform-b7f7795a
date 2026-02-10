import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { TrendingUp, LucideIcon } from "lucide-react";

interface OperationsStat {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  trend?: string;
  status?: "success" | "warning" | "error" | "info";
}

interface OperationsStatsProps {
  stats: OperationsStat[];
}

export function OperationsStats({ stats }: OperationsStatsProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "success":
        return "text-emerald-400";
      case "warning":
        return "text-yellow-600";
      case "error":
        return "text-rose-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${getStatusColor(stat.status)}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              {stat.trend && (
                <div className="flex items-center mt-2 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1 text-emerald-400" />
                  <span className="text-emerald-400">{stat.trend}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
