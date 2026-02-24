import React, { memo, useMemo } from "react";
import { format } from "date-fns";
import { getTodayUTC } from "@/utils/dateUtils";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAUM } from "@/utils/formatters";
import type { FundAUMData } from "@/hooks";

interface FlowData {
  fund_id: string;
  aum: number;
  daily_inflows: number;
  daily_outflows: number;
  net_flow_24h: number;
  aum_source?: string;
}

interface FundSnapshotCardProps {
  fund: FundAUMData;
  flows?: FlowData;
  isSelected: boolean;
  date?: Date;
  onClick: () => void;
  onRecordYield?: () => void;
  onEdit?: () => void;
  showYieldActions?: boolean;
}

export const FundSnapshotCard = memo<FundSnapshotCardProps>(function FundSnapshotCard({
  fund,
  flows,
  isSelected,
  date,
  onClick,
  onRecordYield,
  onEdit,
  showYieldActions = false,
}) {
  const navigate = useNavigate();
  const todayStr = useMemo(() => getTodayUTC(), []);
  const dateStr = useMemo(() => (date ? format(date, "yyyy-MM-dd") : null), [date]);
  const isToday = dateStr === todayStr;
  const displayAUM = isToday ? fund.latest_aum : (flows?.aum ?? 0);

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
        <div className="flex items-center gap-2">
          {isSelected && <Badge className="bg-primary">Selected</Badge>}
          {onEdit && (
            <button
              type="button"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Fund Settings"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
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
              {isToday ? "Total AUM" : "AUM on Date"}
            </p>
            {isToday && (
              <Badge variant="outline" className="text-xs">
                {fund.investor_count} investors
              </Badge>
            )}
          </div>
        </div>

        {/* Daily Flows Grid */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border text-center sm:text-left">
          {/* Inflows */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Deposits</p>
            <p className="text-sm font-semibold text-green-400 break-words">
              +{formatAUM(flows?.daily_inflows || 0, fund.asset)}
            </p>
          </div>

          {/* Outflows */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Withdrawals</p>
            <p className="text-sm font-semibold text-red-400 break-words">
              {(flows?.daily_outflows || 0) !== 0
                ? `-${formatAUM(Math.abs(flows?.daily_outflows || 0), fund.asset)}`
                : formatAUM(0, fund.asset)}
            </p>
          </div>

          {/* Net Flow */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Net Flow</p>
            <p
              className={cn(
                "text-sm font-bold break-words",
                (flows?.net_flow_24h || 0) >= 0 ? "text-green-400" : "text-red-400"
              )}
            >
              {(flows?.net_flow_24h || 0) > 0 ? "+" : ""}
              {formatAUM(flows?.net_flow_24h || 0, fund.asset)}
            </p>
          </div>
        </div>

        {/* Yield Action Buttons */}
        {showYieldActions && (
          <div className="flex gap-2 pt-4 border-t border-border mt-4">
            {onRecordYield && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRecordYield();
                }}
                disabled={fund.investor_count === 0}
                size="sm"
                className={cn(
                  "flex-1 shadow-sm transition-all active:scale-95",
                  fund.investor_count > 0 ? "bg-indigo-600 hover:bg-indigo-500 text-white" : ""
                )}
                variant={fund.investor_count > 0 ? "default" : "secondary"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Yield
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
