import { memo } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface MetricItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "default" | "success" | "warning" | "danger" | "info";
}

interface MetricStripProps {
  metrics: MetricItem[];
  isLoading?: boolean;
  className?: string;
}

const COLOR_CLASSES = {
  default: {
    icon: "text-indigo-400",
    value: "text-white",
  },
  success: {
    icon: "text-emerald-400",
    value: "text-emerald-400",
  },
  warning: {
    icon: "text-amber-400",
    value: "text-amber-400",
  },
  danger: {
    icon: "text-red-400",
    value: "text-red-400",
  },
  info: {
    icon: "text-blue-400",
    value: "text-white",
  },
} as const;

function MetricItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Skeleton className="h-4 w-4 rounded" />
      <div className="space-y-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

export const MetricStrip = memo(function MetricStrip({ metrics, isLoading = false, className }: MetricStripProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm divide-x divide-white/10",
          className
        )}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm",
        className
      )}
    >
      {metrics.map((metric, index) => {
        const colors = COLOR_CLASSES[metric.color || "default"];
        const Icon = metric.icon;

        return (
          <div
            key={metric.label}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 min-w-0",
              index > 0 && "border-l border-white/10"
            )}
          >
            {Icon && <Icon className={cn("h-4 w-4 shrink-0", colors.icon)} />}
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
                {metric.label}
              </p>
              <div className="flex items-center gap-1.5">
                <span className={cn("text-sm font-semibold font-mono tabular-nums", colors.value)}>
                  {metric.value}
                </span>
                {metric.trend && metric.trend !== "neutral" && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[10px] font-medium",
                      metric.trend === "up" ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {metric.trend === "up" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {metric.trendValue}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default MetricStrip;
