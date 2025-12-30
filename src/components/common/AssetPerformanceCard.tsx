import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { getAssetLogo } from "@/utils/assets";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface AssetPerformanceData {
  fundName: string;
  mtd: {
    netIncome: number;
    endingBalance: number;
    rateOfReturn: number;
  };
  qtd: {
    netIncome: number;
    endingBalance: number;
    rateOfReturn: number;
  };
  ytd: {
    netIncome: number;
    endingBalance: number;
    rateOfReturn: number;
  };
  itd: {
    netIncome: number;
    endingBalance: number;
    rateOfReturn: number;
  };
}

interface AssetPerformanceCardProps {
  data: AssetPerformanceData;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}

const formatValue = (val: number, showSign = false) => {
  const absVal = Math.abs(val);
  const sign = val > 0 ? "+" : val < 0 ? "-" : "";
  const formatted = absVal.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  return showSign ? `${sign}${formatted}` : formatted;
};

const formatPct = (val: number) => {
  const sign = val > 0 ? "+" : "";
  return `${sign}${(val * 100).toFixed(2)}%`;
};

export function AssetPerformanceCard({ 
  data, 
  className, 
  compact = false,
  onClick 
}: AssetPerformanceCardProps) {
  const isPositiveMTD = data.mtd.rateOfReturn >= 0;

  if (compact) {
    // Compact card for dashboard overview
    return (
      <Card 
        className={cn(
          "cursor-pointer hover:shadow-md transition-shadow border-l-4",
          isPositiveMTD ? "border-l-green-500" : "border-l-red-500",
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center p-1.5 border">
              <img
                src={getAssetLogo(data.fundName)}
                alt={data.fundName}
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div>
              <p className="font-bold text-sm">{data.fundName} Fund</p>
              <div className="flex items-center gap-1">
                {isPositiveMTD ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={cn(
                  "text-xs font-mono font-semibold",
                  isPositiveMTD ? "text-green-600" : "text-red-600"
                )}>
                  {formatPct(data.mtd.rateOfReturn)} MTD
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-mono font-medium">
                {formatValue(data.mtd.endingBalance)} {data.fundName}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">YTD Return</span>
              <span className={cn(
                "font-mono",
                data.ytd.rateOfReturn >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatPct(data.ytd.rateOfReturn)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full card with all periods
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-background border flex items-center justify-center p-2">
            <img
              src={getAssetLogo(data.fundName)}
              alt={data.fundName}
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div>
            <CardTitle className="text-lg">{data.fundName} YIELD FUND</CardTitle>
            <Badge 
              variant={isPositiveMTD ? "default" : "destructive"} 
              className="mt-1"
            >
              {isPositiveMTD ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {formatPct(data.mtd.rateOfReturn)} MTD
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="p-2 text-left font-semibold text-muted-foreground"></th>
                <th className="p-2 text-center font-semibold text-muted-foreground bg-blue-50/50 dark:bg-blue-900/10">MTD</th>
                <th className="p-2 text-center font-semibold text-muted-foreground">QTD</th>
                <th className="p-2 text-center font-semibold text-muted-foreground bg-yellow-50/50 dark:bg-yellow-900/10">YTD</th>
                <th className="p-2 text-center font-semibold text-muted-foreground bg-purple-50/50 dark:bg-purple-900/10">ITD</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 text-muted-foreground font-medium">Net Income</td>
                <td className={cn("p-2 text-center font-mono bg-blue-50/30 dark:bg-blue-900/5", data.mtd.netIncome >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatValue(data.mtd.netIncome, true)}
                </td>
                <td className={cn("p-2 text-center font-mono", data.qtd.netIncome >= 0 ? "text-green-600/70" : "text-red-600/70")}>
                  {formatValue(data.qtd.netIncome, true)}
                </td>
                <td className={cn("p-2 text-center font-mono bg-yellow-50/30 dark:bg-yellow-900/5", data.ytd.netIncome >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatValue(data.ytd.netIncome, true)}
                </td>
                <td className={cn("p-2 text-center font-mono bg-purple-50/30 dark:bg-purple-900/5", data.itd.netIncome >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatValue(data.itd.netIncome, true)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-2 text-muted-foreground font-medium">End Balance</td>
                <td className="p-2 text-center font-mono font-medium bg-blue-50/30 dark:bg-blue-900/5">
                  {formatValue(data.mtd.endingBalance)}
                </td>
                <td className="p-2 text-center font-mono text-muted-foreground">
                  {formatValue(data.qtd.endingBalance)}
                </td>
                <td className="p-2 text-center font-mono font-medium bg-yellow-50/30 dark:bg-yellow-900/5">
                  {formatValue(data.ytd.endingBalance)}
                </td>
                <td className="p-2 text-center font-mono font-medium bg-purple-50/30 dark:bg-purple-900/5">
                  {formatValue(data.itd.endingBalance)}
                </td>
              </tr>
              <tr>
                <td className="p-2 text-muted-foreground font-medium">% Return</td>
                <td className={cn("p-2 text-center font-mono font-semibold bg-blue-50/30 dark:bg-blue-900/5", data.mtd.rateOfReturn >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatPct(data.mtd.rateOfReturn)}
                </td>
                <td className={cn("p-2 text-center font-mono", data.qtd.rateOfReturn >= 0 ? "text-green-600/70" : "text-red-600/70")}>
                  {formatPct(data.qtd.rateOfReturn)}
                </td>
                <td className={cn("p-2 text-center font-mono font-semibold bg-yellow-50/30 dark:bg-yellow-900/5", data.ytd.rateOfReturn >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatPct(data.ytd.rateOfReturn)}
                </td>
                <td className={cn("p-2 text-center font-mono font-semibold bg-purple-50/30 dark:bg-purple-900/5", data.itd.rateOfReturn >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatPct(data.itd.rateOfReturn)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-2 text-center text-[10px] text-muted-foreground border-t bg-muted/10">
          All values in {data.fundName}
        </div>
      </CardContent>
    </Card>
  );
}
