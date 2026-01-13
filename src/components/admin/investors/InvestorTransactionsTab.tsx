/**
 * InvestorTransactionsTab - Displays transaction history for an investor
 * Uses React Query for data fetching with real-time subscription
 */

import { useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Badge, Button, Skeleton,
} from "@/components/ui";
import { ArrowUpRight, ArrowDownLeft, CreditCard, Plus } from "lucide-react";
import { useRealtimeSubscription } from "@/hooks";
import { AddTransactionDialog } from "@/components/admin/AddTransactionDialog";
import { formatAssetAmount } from "@/utils/assets";
import {
  useInvestorTransactions,
  useInvestorTransactionSummary,
  useInvestorProfileWithFund,
} from "@/hooks/data";

interface InvestorTransactionsTabProps {
  investorId: string;
}

export default function InvestorTransactionsTab({ investorId }: InvestorTransactionsTabProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // React Query hooks
  const {
    data: transactions = [],
    isLoading: txLoading,
    refetch: refetchTransactions,
  } = useInvestorTransactions(investorId, 100);

  const { data: investor, isLoading: profileLoading } = useInvestorProfileWithFund(investorId);
  const { data: summary } = useInvestorTransactionSummary(investorId);

  const isLoading = txLoading || profileLoading;

  // Real-time subscription
  useRealtimeSubscription({
    table: "transactions_v2",
    event: "*",
    filter: `investor_id=eq.${investorId}`,
    onUpdate: () => refetchTransactions(),
  });

  const getTransactionIcon = (type: string) => {
    const typeUpper = (type || "").toUpperCase();
    switch (typeUpper) {
      case "DEPOSIT":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case "WITHDRAWAL":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "YIELD":
      case "INTEREST":
      case "FEE":
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!investor) {
    return <div className="p-6">Investor not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Transactions</h2>
          <p className="text-muted-foreground">Manage transactions for {investor.name}</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} disabled={!investor?.fund_id}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {summary ? `${summary.transactionCount} transactions` : "Complete transaction history"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const txType = (transaction.type || "UNKNOWN").toUpperCase();
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getTransactionIcon(txType)}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{txType}</span>
                        <Badge variant="outline">{transaction.fund?.code || "—"}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{new Date(transaction.tx_date).toLocaleString()}</span>
                      </div>
                      {transaction.notes && (
                        <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {txType === "WITHDRAWAL" ? "-" : ""}
                      {formatAssetAmount(Number(transaction.amount), transaction.fund?.code || "USD")}
                    </div>
                  </div>
                </div>
              );
            })}

            {transactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found for this investor
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      {investor && investor.fund_id && (
        <AddTransactionDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          investorId={investor.id}
          fundId={investor.fund_id}
          onSuccess={() => refetchTransactions()}
        />
      )}
    </div>
  );
}
