import {
  getAssetLogo,
  getAssetName,
  formatInvestorAmount,
  formatSignedInvestorAmount,
} from "@/utils/assets";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PerformancePeriod } from "./PeriodSelector";

interface PerformanceData {
  beginningBalance: number;
  additions: number;
  redemptions: number;
  netIncome: number;
  endingBalance: number;
  rateOfReturn: number;
}

interface PerformanceCardProps {
  fundName: string;
  period: PerformancePeriod;
  data: PerformanceData;
}

export function PerformanceCard({ fundName, data }: PerformanceCardProps) {
  // DB stores rate_of_return already as percentage (e.g. 1.29 = 1.29%)
  const rateOfReturn = data.rateOfReturn;
  const isPositive = rateOfReturn > 0;
  const isNegative = rateOfReturn < 0;

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const trendColor = isPositive
    ? "text-emerald-400"
    : isNegative
      ? "text-rose-400"
      : "text-muted-foreground";

  const badgeBg = isPositive
    ? "bg-emerald-500/10 border-emerald-500/20"
    : isNegative
      ? "bg-rose-500/10 border-rose-500/20"
      : "bg-white/5 border-white/10";

  return (
    <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 relative group">
      {/* Top light reflection */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={getAssetLogo(fundName)}
              alt={fundName}
              className="h-10 w-10 rounded-full ring-2 ring-white/10"
            />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">{getAssetName(fundName)}</p>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">{fundName}</p>
          </div>
        </div>

        {/* Rate of Return badge */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold",
            badgeBg,
            trendColor
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          <span>
            {isPositive ? "+" : ""}
            {rateOfReturn.toFixed(3)}%
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-white/5" />

      {/* Metrics grid */}
      <div className="p-5 grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Beginning</p>
          <p className="font-mono font-semibold text-slate-200 text-sm">
            {formatInvestorAmount(data.beginningBalance, fundName)}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Ending</p>
          <p className="font-mono font-bold text-white text-sm">
            {formatInvestorAmount(data.endingBalance, fundName)}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Additions</p>
          <p className="font-mono text-emerald-400 font-semibold text-sm">
            {data.additions !== 0
              ? formatSignedInvestorAmount(data.additions, fundName)
              : formatInvestorAmount(0, fundName)}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Redemptions</p>
          <p className="font-mono text-rose-400 font-semibold text-sm">
            {data.redemptions !== 0
              ? formatSignedInvestorAmount(-Math.abs(data.redemptions), fundName)
              : formatInvestorAmount(0, fundName)}
          </p>
        </div>

        {/* Net Income — full width */}
        <div className="col-span-2 pt-2 border-t border-white/5 space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Net Income</p>
          <p
            className={cn(
              "font-mono font-bold text-base",
              data.netIncome > 0
                ? "text-emerald-400"
                : data.netIncome < 0
                  ? "text-rose-400"
                  : "text-slate-400"
            )}
          >
            {formatSignedInvestorAmount(data.netIncome, fundName)}
          </p>
        </div>
      </div>
    </div>
  );
}
