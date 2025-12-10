import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, CreditCard, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";
import { AddTransactionDialog } from "@/components/admin/AddTransactionDialog";

interface Transaction {
  id: string;
  investor_id: string;
  asset: string;
  amount: number;
  type: string;
  tx_date: string;
  notes?: string | null;
  tx_hash?: string | null;
  reference_id?: string | null;
}

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

      // Fetch investor profile info (from PROFILES, One ID)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("id", investorId)
        .single();

      if (profileError) throw profileError;

      const investorName = `${profileData?.first_name || ""} ${profileData?.last_name || ""}`.trim() || profileData?.email;

      // Get investor's primary fund from investor_positions
      const { data: positionData } = await supabase
        .from("investor_positions")
        .select("fund_id")
        .eq("investor_id", investorId) // Use investorId (profile.id)
        .limit(1)
        .maybeSingle();

      // Get default fund if no positions yet
      const { data: defaultFund } = await supabase.from("funds").select("id").limit(1).single();

      setInvestor({
        id: investorId, // Use investorId as the ID
        name: investorName,
        email: profileData?.email,
        fund_id: positionData?.fund_id || defaultFund?.id || "",
      });

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from("transactions_v2")
        .select(
          "id, investor_id, asset, amount, type, tx_date, notes, tx_hash, reference_id"
        )
        .eq("investor_id", investorId) // Use investorId (profile.id)
        .order("tx_date", { ascending: false })
        .limit(100);

      if (txError) throw txError;

      setTransactions((txData || []) as Transaction[]);

      // Calculate summary
      const stats = {
        totalCount: txData?.length || 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalYield: 0,
      };

      txData?.forEach((tx: any) => {
        const txType = (tx.type || "").toUpperCase();
        const amount = Number(tx.amount);

        if (txType === "DEPOSIT") {
          stats.totalDeposits += amount;
        } else if (txType === "WITHDRAWAL") {
          stats.totalWithdrawals += amount;
        } else if (txType === "YIELD" || txType === "INTEREST") {
          stats.totalYield += amount;
        }
      });

      setSummary(stats);
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary.totalDeposits.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${summary.totalWithdrawals.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Yield</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${summary.totalYield.toLocaleString()}
            </div>
          </CardContent>
        </Card>
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
                      {txType === "WITHDRAWAL" ? "-" : "+"}
                      {Number(transaction.amount).toLocaleString()} {transaction.asset}
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
