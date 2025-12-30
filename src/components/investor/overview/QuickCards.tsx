import {
  Card, CardContent, CardHeader, CardTitle,
  Button,
  Skeleton,
} from "@/components/ui";
import { Calendar, ArrowRight, Clock, Receipt, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { formatAssetAmount } from "@/utils/assets";

import type { LedgerTransaction } from "@/types/domains/transaction";

// Alias for component props
type Transaction = Pick<LedgerTransaction, 'id' | 'type' | 'amount' | 'asset' | 'tx_date'>;

interface QuickCardsProps {
  lastStatementPeriod?: string;
  recentTransactions?: Transaction[];
  pendingWithdrawalsCount?: number;
  isLoading?: boolean;
}

export function QuickCards({
  lastStatementPeriod,
  recentTransactions = [],
  pendingWithdrawalsCount = 0,
  isLoading,
}: QuickCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Last Statement Period */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Last Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {lastStatementPeriod || "No statements yet"}
          </p>
          <Button variant="link" size="sm" className="p-0 h-auto mt-1" asChild>
            <Link to="/investor/statements">
              View Statements <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.slice(0, 3).map((tx) => (
                <div key={tx.id} className="flex justify-between text-sm">
                  <span className="capitalize text-muted-foreground">
                    {tx.type?.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`font-mono ${
                      tx.amount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {formatAssetAmount(tx.amount, tx.asset)}
                  </span>
                </div>
              ))}
              <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                <Link to="/investor/transactions">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent transactions</p>
          )}
        </CardContent>
      </Card>

      {/* Pending Withdrawals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Withdrawals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingWithdrawalsCount > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <p className="text-lg font-semibold">
                  {pendingWithdrawalsCount} pending
                </p>
              </div>
              <Button variant="link" size="sm" className="p-0 h-auto mt-1" asChild>
                <Link to="/withdrawals">
                  View Details <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No pending withdrawals</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
