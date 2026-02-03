import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui";
import { getAssetLogo, getAssetName, formatAssetAmount } from "@/utils/assets";
import { formatPercentage } from "@/utils/formatters";
import { EmptyState } from "@/components/ui/empty-state";
import { Coins } from "lucide-react";

interface TokenHolding {
  symbol: string;
  balance: number;
  ytdReturn?: number;
}

interface HoldingsByTokenProps {
  holdings: TokenHolding[];
  isLoading?: boolean;
}

export function HoldingsByToken({ holdings, isLoading }: HoldingsByTokenProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings by Token</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!holdings || holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings by Token</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No holdings found"
            description="Your token balances will appear here."
            icon={Coins}
            className="border-0 shadow-none py-12"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holdings by Token</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {holdings.map((holding) => (
            <div
              key={holding.symbol}
              className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <img
                src={getAssetLogo(holding.symbol)}
                alt={holding.symbol}
                className="h-10 w-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  {getAssetName(holding.symbol)}
                </p>
                <p className="text-lg font-semibold font-mono truncate">
                  {formatAssetAmount(holding.balance, holding.symbol)}
                </p>
                {holding.ytdReturn !== undefined && holding.ytdReturn !== 0 && (
                  <p
                    className={`text-xs font-medium ${
                      holding.ytdReturn >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {holding.ytdReturn >= 0 ? "+" : ""}
                    {formatPercentage(holding.ytdReturn * 100)} YTD
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
