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

  const badgeBg = isPositive
    ? "bg-yield/10 border-yield/20"
    : isNegative
      ? "bg-rose-500/10 border-rose-500/20"
      : "bg-white/5 border-white/10";

  const trendTextColor = isPositive
    ? "text-yield"
    : isNegative
      ? "text-rose-400"
      : "text-muted-foreground";

  const netIncomeColor =
    data.netIncome > 0
      ? "text-[hsl(var(--yield-neon))]"
      : data.netIncome < 0
        ? "text-rose-400"
        : "text-muted-foreground";

  return (
    <div
      className="rounded-2xl overflow-hidden relative group transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
      }}
    >
      {/* Top light reflection */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={getAssetLogo(fundName)}
              alt={fundName}
              className="h-9 w-9 rounded-full ring-2 ring-white/10"
            />
          </div>
          <div>
            <p className="text-foreground font-bold text-sm leading-tight">
              {getAssetName(fundName)}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">
              {fundName}
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
            {rateOfReturn.toFixed(3)}%
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
        <p className="font-mono font-bold text-foreground text-2xl md:text-3xl tabular-nums leading-none">
          {formatInvestorAmount(data.endingBalance, fundName)}
        </p>
      </div>

      {/* Metrics grid */}
      <div className="p-5 grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Beginning Balance
          </p>
          <p className="font-mono font-semibold text-muted-foreground text-sm tabular-nums">
            {formatInvestorAmount(data.beginningBalance, fundName)}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Additions
          </p>
          <p className="font-mono text-foreground font-semibold text-sm tabular-nums">
            {data.additions !== 0
              ? formatSignedInvestorAmount(data.additions, fundName)
              : formatInvestorAmount(0, fundName)}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Redemptions
          </p>
          <p className="font-mono text-rose-400 font-semibold text-sm tabular-nums">
            {data.redemptions !== 0
              ? formatSignedInvestorAmount(-Math.abs(data.redemptions), fundName)
              : formatInvestorAmount(0, fundName)}
          </p>
        </div>

        {/* Net Income — yield-neon for positive, full width */}
        <div className="col-span-2 pt-3 border-t border-white/5 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Net Income
          </p>
          <p className={cn("font-mono font-bold text-lg tabular-nums", netIncomeColor)}>
            {formatSignedInvestorAmount(data.netIncome, fundName)}
          </p>
        </div>
      </div>
    </div>
  );
}
