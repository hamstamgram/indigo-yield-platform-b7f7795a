/**
 * Fee Summary Cards
 * Grid of asset summary cards showing totals
 */

import { Card, CardContent } from "@/components/ui";
import { AlertCircle } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatFeeAmount } from "./utils/feeUtils";
import type { FeeSummary } from "@/hooks/data";

interface FeeSummaryCardsProps {
  summaries: FeeSummary[];
}

export function FeeSummaryCards({ summaries }: FeeSummaryCardsProps) {
  if (summaries.length === 0) {
    return (
      <Card className="md:col-span-2 lg:col-span-3">
        <CardContent className="p-6 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No fee transactions in selected date range</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {summaries.map((summary) => (
        <Card key={summary.assetCode}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CryptoIcon symbol={summary.assetCode} className="h-10 w-10" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">{summary.assetCode} Fees</p>
                <p className="text-xl font-mono font-bold">
                  {formatFeeAmount(summary.totalAmount, summary.assetCode)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.transactionCount} transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
