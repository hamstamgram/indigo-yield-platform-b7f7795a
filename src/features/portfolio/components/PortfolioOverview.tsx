import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

interface Position {
  symbol: string;
  quantity: number;
  current_price: number;
  market_value: number;
  gain_loss: number;
  gain_percent: number;
  asset_type: string;
}

interface PortfolioOverviewProps {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  positions: Position[];
  className?: string;
}

export function PortfolioOverview({
  totalValue,
  totalGain,
  totalGainPercent,
  dayChange,
  dayChangePercent,
  positions,
  className,
}: PortfolioOverviewProps) {
  const isGainPositive = totalGain >= 0;
  const isDayChangePositive = dayChange >= 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            {isGainPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                isGainPositive ? "text-green-600" : "text-red-600"
              )}
            >
              ${Math.abs(totalGain).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div
              className={cn(
                "text-xs flex items-center",
                isGainPositive ? "text-green-600" : "text-red-600"
              )}
            >
              <Percent className="h-3 w-3 mr-1" />
              {Math.abs(totalGainPercent).toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Day Change</CardTitle>
            {isDayChangePositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                isDayChangePositive ? "text-green-600" : "text-red-600"
              )}
            >
              ${Math.abs(dayChange).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div
              className={cn(
                "text-xs flex items-center",
                isDayChangePositive ? "text-green-600" : "text-red-600"
              )}
            >
              <Percent className="h-3 w-3 mr-1" />
              {Math.abs(dayChangePercent).toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">Active investments</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Top Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {positions.slice(0, 5).map((position) => (
              <div key={position.symbol} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="font-medium">{position.symbol}</div>
                    <div className="text-sm text-muted-foreground">{position.quantity} shares</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    ${position.market_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div
                    className={cn(
                      "text-sm flex items-center justify-end",
                      position.gain_percent >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {position.gain_percent >= 0 ? "+" : ""}
                    {position.gain_percent.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
