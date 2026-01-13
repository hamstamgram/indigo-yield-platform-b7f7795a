/**
 * Internal Routing Summary Card
 * Shows routing count and amounts summary
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { ArrowRightLeft } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatFeeAmount } from "./utils/feeUtils";
import type { RoutingSummary } from "@/hooks/data";

interface InternalRoutingSummaryCardProps {
  summary: RoutingSummary;
}

export function InternalRoutingSummaryCard({ summary }: InternalRoutingSummaryCardProps) {
  const hasRoutings = summary.totalCount > 0;

  return (
    <Card className={hasRoutings ? "border-orange-500/30 bg-orange-500/5" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className={`h-6 w-6 ${hasRoutings ? "text-orange-500" : "text-muted-foreground"}`} />
          <div>
            <CardTitle className="text-base">Internal Routing</CardTitle>
            <CardDescription className="text-xs">Withdrawals routed to INDIGO</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.keys(summary.byAsset).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(summary.byAsset).map(([asset, data]) => (
                <div key={asset} className="flex items-center gap-2">
                  <CryptoIcon symbol={asset} className="h-5 w-5" />
                  <p className={`text-lg font-mono font-bold ${hasRoutings ? "text-orange-600" : "text-muted-foreground"}`}>
                    {formatFeeAmount(data.amount, asset)} {asset}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-lg font-mono text-muted-foreground">0.00</p>
          )}
          <p className="text-xs text-muted-foreground">
            {summary.totalCount} withdrawal{summary.totalCount !== 1 ? "s" : ""} routed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
