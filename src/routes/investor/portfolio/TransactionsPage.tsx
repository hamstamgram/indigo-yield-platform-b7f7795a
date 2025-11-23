import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, CreditCard, Calendar } from "lucide-react";
import { transactionService, Transaction } from "@/services/transactionService";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalCount: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingCount: 0,
  });

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const [txData, summaryData] = await Promise.all([
        transactionService.fetchUserTransactions(),
        transactionService.calculateTransactionSummary(),
      ]);
      setTransactions(txData);
      setSummary(summaryData);
    } catch (error) {
      console.error("Error loading transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Real-time subscription for live updates
  useRealtimeSubscription({
    table: "transactions_v2",
    event: "*",
    onUpdate: loadTransactions,
  });

  const getTransactionIcon = (type: string) => {
    const typeUpper = (type || "").toUpperCase();
    switch (typeUpper) {
      case "DEPOSIT":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case "WITHDRAWAL":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "FEE":
      case "INTEREST":
      case "YIELD":
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return <div className="p-6">Loading transactions...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">View all platform transactions and transfers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCount}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deposits</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalDeposits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total deposits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Withdrawals</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalWithdrawals.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total withdrawals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Latest transaction activity across all assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const txType = (transaction.txn_type || transaction.type || "UNKNOWN").toUpperCase();
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4">
                    {getTransactionIcon(txType)}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{txType}</span>
                        <Badge variant="outline">{transaction.asset}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{new Date(transaction.occurred_at).toLocaleString()}</span>
                        {transaction.notes && (
                          <>
                            <span>•</span>
                            <span>{transaction.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {txType === "WITHDRAWAL" ? "-" : "+"}
                      {Number(transaction.amount).toLocaleString()} {transaction.asset}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No transactions found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
