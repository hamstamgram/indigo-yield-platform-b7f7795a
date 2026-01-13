/**
 * Yield Earned Summary Card
 * Quick yield stats for INDIGO Fees account
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { TrendingUp } from "lucide-react";
import type { YieldEarned } from "@/hooks/data";

interface YieldEarnedSummaryCardProps {
  yields: YieldEarned[];
}

export function YieldEarnedSummaryCard({ yields }: YieldEarnedSummaryCardProps) {
  const totalYield = yields.reduce((sum, y) => sum + y.totalYieldEarned, 0);
  const totalDistributions = yields.reduce((sum, y) => sum + y.transactionCount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-emerald-500" />
          <div>
            <CardTitle className="text-base">Yield Earned</CardTitle>
            <CardDescription className="text-xs">On fee balances</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {yields.length > 0 ? (
            <>
              <p className="text-2xl font-mono font-bold text-emerald-600">
                +{totalYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalDistributions} distributions
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No yield earned yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
