import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Badge, Button,
} from "@/components/ui";
import { ArrowUpRight, ArrowDownLeft, CreditCard, Plus } from "lucide-react";
import { useRealtimeSubscription } from "@/hooks";
import { toast } from "sonner";
import { AddTransactionDialog } from "@/components/admin/AddTransactionDialog";
import { profileService, positionService } from "@/services/shared";
import { transactionsV2Service } from "@/services/investor";
import { formatAssetAmount } from "@/utils/assets";

import type { Transaction } from "@/types/domains/transaction";

interface InvestorInfo {
  id: string;
  name: string;
  email: string;
  fund_id: string;
}

interface InvestorTransactionsTabProps {
  investorId: string;
}

export default function InvestorTransactionsTab({ investorId }: InvestorTransactionsTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investor, setInvestor] = useState<InvestorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [summary, setSummary] = useState({
    totalCount: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalYield: 0,
  });

  const loadData = useCallback(async () => {
    if (!investorId) return;

    try {
      setLoading(true);

      // Fetch investor profile info using service
      const profileData = await profileService.getById(investorId);

      if (!profileData) throw new Error("Profile not found");

      // Get investor's primary fund from positions
      const positions = await positionService.getByInvestor(investorId);
      const primaryPosition = positions[0];

      // Get default fund if no positions yet
      const funds = await profileService.getActiveFunds();
      const defaultFund = funds[0];

      setInvestor({
        id: investorId,
        name: profileData.name,
        email: profileData.email,
        fund_id: primaryPosition?.fund_id || defaultFund?.id || "",
      });

      // Fetch transactions using service
      const txData = await transactionsV2Service.getByInvestorId(investorId, { limit: 100 });
      setTransactions(txData as Transaction[]);

      // Calculate summary
      const txSummary = await transactionsV2Service.getSummary(investorId);
      setSummary({
        totalCount: txSummary.transactionCount,
        totalDeposits: txSummary.totalDeposits,
        totalWithdrawals: txSummary.totalWithdrawals,
        totalYield: txSummary.totalYield,
      });
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load transaction data");
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscription
  useRealtimeSubscription({
    table: "transactions_v2",
    event: "*",
    filter: `investor_id=eq.${investorId}`,
    onUpdate: loadData,
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

  if (loading) {
    return <div className="p-6">Loading transaction data...</div>;
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
          <CardDescription>Complete transaction history</CardDescription>
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
                        <Badge variant="outline">{transaction.asset}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{new Date(transaction.tx_date).toLocaleString()}</span>
                        {transaction.reference_id && (
                          <>
                            <span>•</span>
                            <span>Ref: {transaction.reference_id}</span>
                          </>
                        )}
                        {transaction.tx_hash && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-xs">
                              {transaction.tx_hash.substring(0, 10)}...
                            </span>
                          </>
                        )}
                      </div>
                      {transaction.notes && (
                        <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {txType === "WITHDRAWAL" ? "-" : ""}
                      {formatAssetAmount(Number(transaction.amount), transaction.asset)}
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
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
