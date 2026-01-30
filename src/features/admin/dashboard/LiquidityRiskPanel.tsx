import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from "@/components/ui";
import { Droplets, TrendingDown, AlertTriangle } from "lucide-react";
import { useLiquidityRisk, type LiquidityRisk } from "@/hooks/data/admin/useRiskAlerts";
import { logWarn } from "@/lib/logger";

const riskLevelConfig = {
  LOW: { color: "bg-green-500", text: "text-green-700", bg: "bg-green-50" },
  MEDIUM: { color: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50" },
  HIGH: { color: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  NO_AUM: { color: "bg-gray-400", text: "text-gray-700", bg: "bg-gray-50" },
} as const;

const fallbackRiskConfig = riskLevelConfig.LOW;

export function LiquidityRiskPanel() {
  const { data: liquidityData, isLoading } = useLiquidityRisk();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading liquidity data...
        </CardContent>
      </Card>
    );
  }

  const safeLiquidityData = (liquidityData || []).filter((fund): fund is LiquidityRisk =>
    Boolean(fund && fund.fund_id)
  );

  const riskyFunds = safeLiquidityData.filter(
    (f) => f.risk_level === "HIGH" || f.risk_level === "MEDIUM"
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Liquidity Risk</CardTitle>
          </div>
          {riskyFunds.length > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {riskyFunds.length} funds need attention
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {safeLiquidityData.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No active funds to monitor</div>
        ) : (
          <div className="space-y-4">
            {safeLiquidityData.map((fund) => {
              const riskLevel = fund.risk_level ?? "LOW";
              const normalizedRiskLevel = riskLevelConfig[riskLevel as keyof typeof riskLevelConfig]
                ? riskLevel
                : "LOW";
              const config =
                riskLevelConfig[normalizedRiskLevel as keyof typeof riskLevelConfig] ??
                fallbackRiskConfig;
              if (!riskLevelConfig[riskLevel as keyof typeof riskLevelConfig]) {
                logWarn("liquidityRisk.unexpectedLevel", {
                  fundId: fund.fund_id,
                  fundCode: fund.fund_code,
                  riskLevel,
                });
              }
              const withdrawalRatio =
                typeof fund.withdrawal_ratio === "number" ? fund.withdrawal_ratio : 0;
              const pressurePct = Math.min(withdrawalRatio, 100);

              return (
                <div key={fund.fund_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{fund.fund_code}</Badge>
                      <span className="text-sm text-muted-foreground">{fund.fund_name}</span>
                    </div>
                    <Badge variant="secondary" className={`${config.bg} ${config.text}`}>
                      {normalizedRiskLevel}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Withdrawal Pressure</span>
                      <span className="font-medium">{pressurePct.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={pressurePct}
                      className="h-2"
                      indicatorClassName={config.color}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="text-muted-foreground">AUM</div>
                      <div className="font-medium">
                        {fund.total_aum?.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="text-muted-foreground">Pending</div>
                      <div className="font-medium text-yellow-600">
                        {fund.pending_withdrawals?.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="text-muted-foreground">Available</div>
                      <div className="font-medium text-green-600">
                        {((fund.total_aum || 0) - (fund.pending_withdrawals || 0)).toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
