import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Calendar, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PortfolioHeroProps {
  totalBalance: number;
  totalYtdReturn: number;
  activeFunds: number;
  lastUpdated?: string;
  isLoading?: boolean;
  className?: string;
  /** If true, shows "as of" label instead of "Last updated" */
  isFinalizedData?: boolean;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

const formatPct = (val: number) => {
  const sign = val > 0 ? "+" : "";
  return `${sign}${(val * 100).toFixed(2)}%`;
};

export function PortfolioHero({
  totalBalance,
  totalYtdReturn,
  activeFunds,
  lastUpdated,
  isLoading,
  className,
  isFinalizedData = false,
}: PortfolioHeroProps) {
  const isPositive = totalYtdReturn >= 0;

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-48" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background border-primary/20",
      className
    )}>
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          {/* Main Balance */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Wallet className="h-3 w-3" />
              Total Portfolio Value
              {isFinalizedData && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        This shows your finalized month-end balance. 
                        Mid-month values are not displayed until the period is closed.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </p>
            <p className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight">
              {formatCurrency(totalBalance)}
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {isFinalizedData ? "As of period ending" : "Last updated"} {lastUpdated}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 md:gap-6">
            {/* YTD Return */}
            <div className="min-w-[120px]">
              <p className="text-xs text-muted-foreground mb-1">YTD Return</p>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-full",
                  isPositive ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                )}>
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <span className={cn(
                  "text-xl font-mono font-bold",
                  isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {formatPct(totalYtdReturn)}
                </span>
              </div>
            </div>

            {/* Active Funds */}
            <div className="min-w-[100px]">
              <p className="text-xs text-muted-foreground mb-1">Active Funds</p>
              <p className="text-xl font-mono font-bold">
                {activeFunds}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
