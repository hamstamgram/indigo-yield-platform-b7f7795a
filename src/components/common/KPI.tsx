import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPIProps {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    type: "increase" | "decrease" | "neutral";
  };
  icon?: LucideIcon;
  subtitle?: string;
  format?: "currency" | "percentage" | "number";
  loading?: boolean;
  className?: string;
}

export default function KPI({
  title,
  value,
  change,
  icon: Icon,
  subtitle,
  format = "number",
  loading = false,
  className = "",
}: KPIProps) {
  const formatValue = (val: string | number): string => {
    if (loading) return "...";

    const numVal = typeof val === "string" ? parseFloat(val) : val;

    switch (format) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numVal);
      case "percentage":
        return `${numVal.toFixed(2)}%`;
      default:
        return new Intl.NumberFormat("en-US").format(numVal);
    }
  };

  const getChangeColor = (type: "increase" | "decrease" | "neutral"): string => {
    switch (type) {
      case "increase":
        return "text-green-600";
      case "decrease":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold">
            {loading ? (
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            ) : (
              formatValue(value)
            )}
          </div>
          <div className="flex items-center justify-between">
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {change && (
              <p className={`text-xs ${getChangeColor(change.type)}`}>
                {change.type === "increase" ? "+" : change.type === "decrease" ? "-" : ""}
                {typeof change.value === "number" ? change.value.toFixed(2) : change.value}
                {format === "percentage" ? "pp" : ""}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
