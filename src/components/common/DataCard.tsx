/**
 * DataCard - Standardized card for displaying metrics and data
 * 
 * Provides consistent layout for KPIs, stats, and summary data
 * with support for loading states, trends, and actions.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface DataCardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: string | number | React.ReactNode;
  /** Optional description or subtitle */
  description?: string;
  /** Icon to display */
  icon?: LucideIcon;
  /** Icon color class */
  iconColor?: string;
  /** Icon background color class */
  iconBgColor?: string;
  /** Trend percentage (positive = up, negative = down) */
  trend?: number;
  /** Custom trend label */
  trendLabel?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Additional content below the main value */
  footer?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Card size variant */
  size?: "sm" | "md" | "lg";
}

function TrendIndicator({ value, label }: { value: number; label?: string }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        isPositive && "text-emerald-600 dark:text-emerald-400",
        isNegative && "text-destructive",
        !isPositive && !isNegative && "text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{Math.abs(value).toFixed(1)}%</span>
      {label && <span className="text-muted-foreground font-normal">{label}</span>}
    </div>
  );
}

function DataCardSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const valueHeight = size === "sm" ? "h-6" : size === "lg" ? "h-10" : "h-8";
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className={cn(valueHeight, "w-32 mb-1")} />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

export function DataCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  trend,
  trendLabel,
  isLoading = false,
  footer,
  onClick,
  className,
  size = "md",
}: DataCardProps) {
  if (isLoading) {
    return <DataCardSkeleton size={size} />;
  }

  const valueSize = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  }[size];

  const padding = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  }[size];

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/20",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className={cn("pb-2", padding)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && (
            <div className={cn("p-2 rounded-lg", iconBgColor)}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("pt-0", padding, "pb-4")}>
        <div className={cn("font-bold tracking-tight", valueSize)}>
          {value}
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          {trend !== undefined && (
            <TrendIndicator value={trend} label={trendLabel} />
          )}
          {description && !trend && (
            <CardDescription className="text-xs">
              {description}
            </CardDescription>
          )}
          {description && trend !== undefined && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
        
        {footer && (
          <div className="mt-3 pt-3 border-t">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Grid container for DataCards
 */
export function DataCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
  }[columns];

  return (
    <div className={cn("grid gap-4", gridCols, className)}>
      {children}
    </div>
  );
}

export default DataCard;
