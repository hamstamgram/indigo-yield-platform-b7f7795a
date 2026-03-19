/**
 * Fee Revenue Collected Summary Card
 * Displays fee revenue collected from yield distributions, broken down by asset
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { DollarSign, Info } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatFeeAmount } from "./utils/feeUtils";
import { toNumber } from "@/utils/numeric";
import type { YieldEarned } from "@/hooks/data";

interface YieldEarnedSummaryCardProps {
  yields: YieldEarned[];
}

export function YieldEarnedSummaryCard({ yields }: YieldEarnedSummaryCardProps) {
  // Group by asset (multiple funds may share the same asset)
  const byAsset = yields.reduce<Record<string, { total: number; count: number }>>((acc, y) => {
    const existing = acc[y.asset] || { total: 0, count: 0 };
    existing.total += toNumber(y.totalYieldEarned);
    existing.count += y.transactionCount;
    acc[y.asset] = existing;
    return acc;
  }, {});

  const assetEntries = Object.entries(byAsset);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-base">Fee Revenue Collected</CardTitle>
            <CardDescription className="text-xs">From yield distributions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {assetEntries.length > 0 ? (
            assetEntries.map(([asset, { total, count }]) => (
              <div key={asset} className="flex items-center gap-3 p-2.5 rounded-lg bg-background">
                <CryptoIcon symbol={asset} className="h-7 w-7" />
                <div>
                  <p className="font-mono font-semibold text-sm text-yield">
                    +{formatFeeAmount(total, asset)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asset} &middot; {count} dist.
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-muted-foreground">
              <Info className="h-4 w-4" />
              <p className="text-sm">No yield earned yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
