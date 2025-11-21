import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  percentage?: number;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  percentage,
  trend = "neutral",
  icon,
  className,
}: KPICardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600 dark:text-green-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <ArrowUpIcon className="h-4 w-4" />;
      case "down":
        return <ArrowDownIcon className="h-4 w-4" />;
      default:
        return <TrendingUpIcon className="h-4 w-4" />;
    }
  };

  return (
    <Card className={cn("transition-all hover:shadow-lg", className)} data-testid="kpi-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {percentage !== undefined && (
          <div className={cn("flex items-center mt-2", getTrendColor())}>
            {getTrendIcon()}
            <span className="ml-1 text-sm font-medium">
              {percentage >= 0 ? "+" : ""}
              {percentage.toFixed(2)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
