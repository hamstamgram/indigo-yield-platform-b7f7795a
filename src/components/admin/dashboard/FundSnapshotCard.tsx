import React from "react";
import { format } from "date-fns";
import {
  Card, CardContent, CardHeader, CardTitle,
  Badge,
} from "@/components/ui";
import { CryptoIcon } from "@/components/CryptoIcons";
import { cn } from "@/lib/utils";
import { formatAUM } from "@/utils/formatters";
import type { FundAUMData } from "@/hooks";

interface FlowData {
  fund_id: string;
  aum: number;
  daily_inflows: number;
  daily_outflows: number;
  net_flow_24h: number;
}

interface FundSnapshotCardProps {
  fund: FundAUMData;
  flows?: FlowData;
  isSelected: boolean;
  date?: Date;
  onClick: () => void;
}

export const FundSnapshotCard: React.FC<FundSnapshotCardProps> = ({
  fund,
  flows,
  isSelected,
  date,
  onClick,
}) => {
  const isToday = date && format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const displayAUM = isToday ? fund.latest_aum : (flows?.aum ?? fund.latest_aum);

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all cursor-pointer border-l-4",
        isSelected ? "ring-2 ring-primary shadow-lg" : "",
        "border-l-primary"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <CryptoIcon symbol={fund.asset} className="h-10 w-10" />
          <div>
            <CardTitle className="text-lg font-bold">{fund.asset} Fund</CardTitle>
            <p className="text-xs text-muted-foreground">{fund.name}</p>
          </div>
        </div>
        {isSelected && <Badge className="bg-primary">Selected</Badge>}
      </CardHeader>
      <CardContent>
        {/* Main AUM */}
        <div className="mt-4 mb-6">
          <div className="text-2xl font-bold text-foreground">
            {formatAUM(displayAUM, fund.asset)}{" "}
            <span className="text-sm text-muted-foreground font-normal">{fund.asset}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              {isToday ? 'Total AUM' : 'AUM on Date'}
            </p>
            {isToday && (
              <Badge variant="outline" className="text-xs">
                {fund.investor_count} investors
              </Badge>
            )}
          </div>
        </div>

        {/* Daily Flows Grid */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
          {/* Inflows */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Deposits</p>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              +{formatAUM(flows?.daily_inflows || 0, fund.asset)}
            </p>
          </div>

          {/* Outflows */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Withdrawals</p>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              -{formatAUM(flows?.daily_outflows || 0, fund.asset)}
            </p>
          </div>

          {/* Net Flow */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Net Flow</p>
            <p
              className={cn(
                "text-sm font-bold",
                (flows?.net_flow_24h || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}
            >
              {(flows?.net_flow_24h || 0) > 0 ? "+" : ""}
              {formatAUM(flows?.net_flow_24h || 0, fund.asset)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
