import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAssetLogo, getAssetName, formatAssetAmount, formatSignedAssetAmount } from "@/utils/assets";
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
  const rateOfReturn = data.rateOfReturn * 100;
  const isPositive = rateOfReturn > 0;
  const isNegative = rateOfReturn < 0;

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const trendColor = isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-muted-foreground";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <img
            src={getAssetLogo(fundName)}
            alt={fundName}
            className="h-8 w-8 rounded-full"
          />
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Beginning Balance</p>
            <p className="font-mono font-medium">
              {formatAssetAmount(data.beginningBalance, fundName)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ending Balance</p>
            <p className="font-mono font-semibold">
              {formatAssetAmount(data.endingBalance, fundName)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Additions</p>
            <p className="font-mono text-green-600">
              {formatSignedAssetAmount(data.additions, fundName)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Redemptions</p>
            <p className="font-mono text-red-600">
              {data.redemptions !== 0 ? formatSignedAssetAmount(-Math.abs(data.redemptions), fundName) : formatAssetAmount(0, fundName)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Net Income</p>
            <p className={`font-mono font-medium ${data.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatSignedAssetAmount(data.netIncome, fundName)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
