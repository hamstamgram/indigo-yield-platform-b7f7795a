/**
 * Fees Balance Card
 * Displays INDIGO Fees account balances by asset
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Wallet, Info } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatFeeAmount } from "./utils/feeUtils";

interface FeesBalanceCardProps {
  balances: Record<string, string | number>;
}

export function FeesBalanceCard({ balances }: FeesBalanceCardProps) {
  return (
    <Card className="border-primary/30 bg-primary/5 lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-base">INDIGO Fees Account Balance</CardTitle>
            <CardDescription className="text-xs">Current fund positions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(balances).length > 0 ? (
            Object.entries(balances).map(([asset, balance]) => (
              <div key={asset} className="flex items-center gap-3 p-2.5 rounded-lg bg-background">
                <CryptoIcon symbol={asset} className="h-7 w-7" />
                <div>
                  <p className="font-mono font-semibold text-sm">
                    {formatFeeAmount(balance, asset)}
                  </p>
                  <p className="text-xs text-muted-foreground">{asset}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-muted-foreground">
              <Info className="h-4 w-4" />
              <p className="text-sm">No balances recorded yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
