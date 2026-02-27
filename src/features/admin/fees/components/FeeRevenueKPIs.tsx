/**
 * INDIGO FEES KPI Cards
 * Shows MTD, YTD, and ITD fee revenue totals grouped by asset.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatFeeAmount } from "./utils/feeUtils";
import { startOfMonth, startOfYear, parseISO, isWithinInterval } from "date-fns";
import { toNumber } from "@/utils/numeric";
import type { FeeRecord } from "@/hooks/data";

interface FeeRevenueKPIsProps {
  fees: FeeRecord[];
}

interface AssetTotal {
  asset: string;
  amount: number;
}

function computeAssetTotals(fees: FeeRecord[]): AssetTotal[] {
  const map = new Map<string, number>();
  for (const fee of fees) {
    map.set(fee.asset, (map.get(fee.asset) || 0) + toNumber(fee.amount));
  }
  return Array.from(map.entries())
    .map(([asset, amount]) => ({ asset, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function KPICard({ title, totals }: { title: string; totals: AssetTotal[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {totals.length > 0 ? (
          totals.map(({ asset, amount }) => (
            <div key={asset} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CryptoIcon symbol={asset} className="h-5 w-5" />
                <span className="text-xs text-muted-foreground">{asset}</span>
              </div>
              <span className="font-mono text-sm font-semibold text-yield">
                +{formatFeeAmount(amount, asset)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No revenue</p>
        )}
      </CardContent>
    </Card>
  );
}

export function FeeRevenueKPIs({ fees }: FeeRevenueKPIsProps) {
  const now = new Date();

  const { mtd, ytd, itd } = useMemo(() => {
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const mtdFees: FeeRecord[] = [];
    const ytdFees: FeeRecord[] = [];

    for (const fee of fees) {
      const feeDate = parseISO(fee.txDate || fee.createdAt);
      if (isWithinInterval(feeDate, { start: yearStart, end: now })) {
        ytdFees.push(fee);
        if (isWithinInterval(feeDate, { start: monthStart, end: now })) {
          mtdFees.push(fee);
        }
      }
    }

    return {
      mtd: computeAssetTotals(mtdFees),
      ytd: computeAssetTotals(ytdFees),
      itd: computeAssetTotals(fees),
    };
  }, [fees]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <KPICard title="MTD Revenue" totals={mtd} />
      <KPICard title="YTD Revenue" totals={ytd} />
      <KPICard title="ITD Revenue" totals={itd} />
    </div>
  );
}
