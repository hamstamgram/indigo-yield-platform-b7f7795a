import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  getAssetLogo,
  getAssetName,
  formatInvestorAmount,
  formatSignedInvestorAmount,
} from "@/utils/assets";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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

export function PerformanceCard({ fundName, period, data }: PerformanceCardProps) {
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <img src={getAssetLogo(fundName)} alt={fundName} className="h-8 w-8 rounded-full" />
          <div>
            <CardTitle className="text-lg">{getAssetName(fundName)}</CardTitle>
            <p className="text-xs text-muted-foreground uppercase">{fundName}</p>
          </div>
          <div className={`ml-auto flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="font-semibold">
              {isPositive ? "+" : ""}
              {rateOfReturn.toFixed(2)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Beginning Balance</p>
            <p className="font-mono font-medium">
              {formatInvestorAmount(data.beginningBalance, fundName)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ending Balance</p>
            <p className="font-mono font-semibold">
              {formatInvestorAmount(data.endingBalance, fundName)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Additions</p>
            <p className="font-mono text-emerald-400">
              {formatSignedInvestorAmount(data.additions, fundName)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Redemptions</p>
            <p className="font-mono text-rose-400">
              {data.redemptions !== 0
                ? formatSignedInvestorAmount(-Math.abs(data.redemptions), fundName)
                : formatInvestorAmount(0, fundName)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Net Income</p>
            <p
              className={`font-mono font-medium ${data.netIncome >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {formatSignedInvestorAmount(data.netIncome, fundName)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
