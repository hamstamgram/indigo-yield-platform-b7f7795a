import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { WithdrawalStats } from "@/types/domains";
import { CheckCircle2, Clock, Coins, XCircle } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatAssetAmount } from "@/utils/assets";

interface WithdrawalStatsProps {
  stats: WithdrawalStats;
  isLoading: boolean;
}


export function WithdrawalStatsComponent({ stats, isLoading }: WithdrawalStatsProps) {
  const statCards = [
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-yield",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-rose-400",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-7 w-20 animate-pulse bg-muted rounded" />
            ) : (
              <div className="text-2xl font-bold">{stat.value}</div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Per-Asset Pending Amounts Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending by Asset</CardTitle>
          <Coins className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-7 w-20 animate-pulse bg-muted rounded" />
          ) : stats.pending_by_asset.length === 0 ? (
            <div className="text-sm text-muted-foreground">No pending</div>
          ) : (
            <div className="space-y-1">
              {stats.pending_by_asset.map(({ asset, amount }) => (
                <div key={asset} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1.5">
                    <CryptoIcon symbol={asset} className="h-4 w-4" />
                  </div>
                  <span className="font-bold font-mono">{formatAssetAmount(amount, asset)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
