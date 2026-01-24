import {
  Card,
  CardContent,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { TrendingUp, TrendingDown, Wallet, Calendar, Info } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const totalYtdReturn =
    assetBalances.length > 0
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
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-300 group",
        "bg-gradient-to-br from-indigo-900/90 via-indigo-950/90 to-black/90",
        "dark:from-indigo-500/10 dark:via-background/50 dark:to-background/80",
        className
      )}
    >
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-yield-neon/10 rounded-full blur-3xl opacity-30" />

      <div className="relative z-10 p-6 md:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          {/* Main Balances - Per Asset */}
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                <Wallet className="h-5 w-5 text-indigo-300" />
              </div>
              <p className="text-sm font-bold text-indigo-200 uppercase tracking-widest flex items-center gap-2 font-display">
                Total Balance
                {isFinalizedData && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-indigo-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 border-slate-700 text-slate-300">
                      <p className="max-w-xs text-xs">Finalized month-end balance.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </p>
            </div>

            {assetBalances.length === 0 ? (
              <p className="text-indigo-300/60 text-lg font-light italic">No active positions</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assetBalances.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="flex items-center gap-4 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border border-white/5 hover:border-white/20 group/card"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-md opacity-0 group-hover/card:opacity-100 transition-opacity" />
                      <img
                        src={getAssetLogo(asset.symbol)}
                        alt={asset.symbol}
                        className="h-10 w-10 rounded-full relative z-10 shadow-sm"
                      />
                    </div>
                    <div>
                      <p className="text-2xl lg:text-3xl font-display font-bold tracking-tight text-white drop-shadow-sm">
                        {formatTokenAmount(asset.balance, asset.symbol)}
                        <span className="text-base lg:text-lg font-medium text-indigo-200 ml-1.5 opacity-80">
                          {asset.symbol.toUpperCase()}
                        </span>
                      </p>
                      {asset.ytdReturn !== undefined && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {asset.ytdReturn >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-yield-neon" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-rose-400" />
                          )}
                          <p
                            className={cn(
                              "text-xs font-mono font-medium tracking-wide",
                              asset.ytdReturn >= 0 ? "text-yield-neon" : "text-rose-400"
                            )}
                          >
                            YTD {formatPct(asset.ytdReturn)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lastUpdated && (
              <p className="text-xs text-indigo-300/50 flex items-center gap-1.5 pl-1 pt-2">
                <Calendar className="h-3 w-3" />
                {isFinalizedData ? "As of period ending" : "Last updated"} {lastUpdated}
              </p>
            )}
          </div>

          {/* Stats Column */}
          <div className="flex flex-row lg:flex-col gap-4 lg:gap-6 lg:border-l lg:border-white/10 lg:pl-8">
            {/* Average YTD Return */}
            {assetBalances.length > 0 && (
              <div className="min-w-[140px] p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5">
                <p className="text-xs font-medium text-indigo-200/70 mb-2 uppercase tracking-wider">
                  Avg Return
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-1.5 rounded-lg shadow-inner",
                      isPositive
                        ? "bg-yield-neon/20 ring-1 ring-yield-neon/50"
                        : "bg-rose-500/20 ring-1 ring-rose-500/50"
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-yield-neon" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-400" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xl font-mono font-bold tracking-tight",
                      isPositive
                        ? "text-yield-neon drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]"
                        : "text-rose-400"
                    )}
                  >
                    {formatPct(totalYtdReturn)}
                  </span>
                </div>
              </div>
            )}

            {/* Active Funds */}
            <div className="min-w-[140px] p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5">
              <p className="text-xs font-medium text-indigo-200/70 mb-2 uppercase tracking-wider">
                Active Funds
              </p>
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/50 text-indigo-300 shadow-inner">
                  <Wallet className="h-4 w-4" />
                </div>
                <p className="text-xl font-mono font-bold text-white">{activeFunds}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
