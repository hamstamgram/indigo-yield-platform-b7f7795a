/**
 * Yield Earned Tab
 * Shows yield earned by INDIGO Fees account per fund
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatFeeAmount } from "./utils/feeUtils";
import type { YieldEarned } from "@/hooks/data";

interface YieldEarnedTabProps {
  yields: YieldEarned[];
}

export function YieldEarnedTab({ yields }: YieldEarnedTabProps) {
  return (
    <Card className="border-yield/30 bg-emerald-500/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-yield" />
          <div>
            <CardTitle>Yield Earned by INDIGO Fees Account</CardTitle>
            <CardDescription>
              INDIGO FEES participates in yield distributions just like any investor. This shows
              yield earned on the accumulated fee balance.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {yields.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {yields.map((item) => (
              <div key={item.fundId} className="p-4 rounded-lg bg-background border">
                <div className="flex items-center gap-3 mb-3">
                  <CryptoIcon symbol={item.asset} className="h-8 w-8" />
                  <div>
                    <p className="font-medium">{item.fundName}</p>
                    <p className="text-xs text-muted-foreground">{item.asset}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Yield</span>
                    <span className="font-mono font-semibold text-yield">
                      +{formatFeeAmount(item.totalYieldEarned, item.asset)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Distributions</span>
                    <span className="text-sm">{item.transactionCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ArrowUpRight className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium mb-1">No yield earned yet</p>
            <p className="text-sm max-w-md mx-auto">
              Yield will be earned when month-end reporting distributions include INDIGO FEES
              positions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
