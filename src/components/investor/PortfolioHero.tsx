import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Calendar, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAssetLogo } from "@/utils/assets";
import { formatTokenAmount } from "@/utils/formatters";

export interface AssetBalance {
  symbol: string;
  balance: number;
  ytdReturn?: number;
}

interface PortfolioHeroProps {
  /** Per-asset balances (token-denominated) */
  assetBalances: AssetBalance[];
  activeFunds: number;
  lastUpdated?: string;
  isLoading?: boolean;
  className?: string;
  /** If true, shows "as of" label instead of "Last updated" */
  isFinalizedData?: boolean;
}

const formatPct = (val: number) => {
  const sign = val > 0 ? "+" : "";
  return `${sign}${(val * 100).toFixed(2)}%`;
};

export function PortfolioHero({
  assetBalances,
  activeFunds,
  lastUpdated,
  isLoading,
  className,
  isFinalizedData = false,
}: PortfolioHeroProps) {
  // Calculate weighted average YTD return
  const totalYtdReturn = assetBalances.length > 0
    ? assetBalances.reduce((sum, a) => sum + (a.ytdReturn || 0), 0) / assetBalances.length
    : 0;
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
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Main Balances - Per Asset */}
          <div className="space-y-3 flex-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Wallet className="h-3 w-3" />
              Portfolio Balances
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
            
            {assetBalances.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active positions</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {assetBalances.map((asset) => (
                  <div 
                    key={asset.symbol} 
                    className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2"
                  >
                    <img 
                      src={getAssetLogo(asset.symbol)} 
                      alt={asset.symbol}
                      className="h-6 w-6 rounded-full"
                    />
                    <div>
                      <p className="text-lg md:text-xl font-display font-bold tracking-tight">
                        {formatTokenAmount(asset.balance, asset.symbol)} {asset.symbol.toUpperCase()}
                      </p>
                      {asset.ytdReturn !== undefined && (
                        <p className={cn(
                          "text-xs font-mono",
                          asset.ytdReturn >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          YTD {formatPct(asset.ytdReturn)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {lastUpdated && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {isFinalizedData ? "As of period ending" : "Last updated"} {lastUpdated}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 md:gap-6">
            {/* Average YTD Return */}
            {assetBalances.length > 0 && (
              <div className="min-w-[120px]">
                <p className="text-xs text-muted-foreground mb-1">Avg YTD Return</p>
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
            )}

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
