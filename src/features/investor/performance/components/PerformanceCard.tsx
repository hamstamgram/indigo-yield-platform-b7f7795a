import React from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercentage } from "@/utils/financial";

interface PerformanceCardProps {
  title: string;
  assetCode: string;
  beginningBalance: number;
  endingBalance: number;
  additions: number;
  redemptions: number;
  netIncome: number;
  rateOfReturn: number;
}

export const PerformanceCard = ({
  title,
  assetCode,
  beginningBalance,
  endingBalance,
  additions,
  redemptions,
  netIncome,
  rateOfReturn,
}: PerformanceCardProps) => {
  const isPositive = rateOfReturn >= 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  const trendTextColor = isPositive ? "text-emerald-400" : "text-rose-400";
  const badgeBg = isPositive ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20";

  return (
    <div className="bg-card/30 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-white/10 hover:shadow-emerald-500/5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white">{title}</h3>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
              Performance Report
            </p>
          </div>
        </div>

        {/* Rate of Return badge */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-bold",
            badgeBg,
            trendTextColor
          )}
        >
          <TrendIcon className="h-3 w-3" />
          <span>
            {isPositive ? "+" : ""}
            {formatPercentage(rateOfReturn, 4)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-white/5" />

      {/* Ending Balance — hero number */}
      <div className="px-5 py-4 border-b border-white/5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
          Ending Balance
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tighter text-white">
            {endingBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })}
          </span>
          <span className="text-xs font-bold text-muted-foreground uppercase">{assetCode}</span>
        </div>
      </div>

      {/* Detailed stats grid */}
      <div className="grid grid-cols-2 gap-px bg-white/5">
        <div className="bg-card/40 p-4">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
            Beginning
          </p>
          <p className="text-sm font-bold text-white/90">
            {beginningBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })}
          </p>
        </div>
        <div className="bg-card/40 p-4 border-l border-white/5">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
            Net Income
          </p>
          <p className={cn("text-sm font-bold", isPositive ? "text-emerald-400" : "text-rose-400")}>
            {isPositive ? "+" : ""}
            {netIncome.toLocaleString(undefined, { maximumFractionDigits: 8 })}
          </p>
        </div>
        <div className="bg-card/40 p-4 border-t border-white/5">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
            Additions
          </p>
          <p className="text-sm font-bold text-emerald-400/80">
            +{additions.toLocaleString(undefined, { maximumFractionDigits: 8 })}
          </p>
        </div>
        <div className="bg-card/40 p-4 border-t border-l border-white/5">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
            Redemptions
          </p>
          <p className="text-sm font-bold text-rose-400/80">
            -{Math.abs(redemptions).toLocaleString(undefined, { maximumFractionDigits: 8 })}
          </p>
        </div>
      </div>
    </div>
  );
};
