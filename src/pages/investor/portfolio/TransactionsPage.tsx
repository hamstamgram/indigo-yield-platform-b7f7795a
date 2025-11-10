import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, CreditCard, Calendar } from 'lucide-react';

interface SimpleTransaction {
  id: string;
  amount: number;
  asset_code: string;
  type: string;
  status: string;
  created_at: string;
  investor_name?: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<SimpleTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading transactions
    setTimeout(() => {
      setTransactions([
        {
          id: '1',
          amount: 1000,
          asset_code: 'BTC',
          type: 'DEPOSIT',
          status: 'confirmed',
          created_at: new Date().toISOString(),
          investor_name: 'REDACTED'
        },
        {
          id: '2',
          amount: 500,
          asset_code: 'ETH',
          type: 'WITHDRAWAL',
          status: 'pending',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          investor_name: 'REDACTED'
        },
        {
          id: '3',
          amount: 25,
          asset_code: 'USDC',
          type: 'FEE',
          status: 'confirmed',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          investor_name: 'REDACTED'
        }
      ]);
      setLoading(false);
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'WITHDRAWAL': return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'FEE': return <CreditCard className="h-4 w-4 text-blue-500" />;
      default: return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'outline';
      case 'failed': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'secondary';
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
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deposits</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.filter(t => t.type === 'DEPOSIT').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Incoming transfers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Withdrawals</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.filter(t => t.type === 'WITHDRAWAL').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Outgoing transfers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.filter(t => t.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>
            Latest transaction activity across all assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-4">
                  {getTransactionIcon(transaction.type)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{transaction.type}</span>
                      <Badge variant="outline">{transaction.asset_code}</Badge>
                      <Badge variant={getStatusVariant(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Investor: {transaction.investor_name}</span>
                      <span>•</span>
                      <span>{new Date(transaction.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {transaction.type === 'WITHDRAWAL' ? '-' : '+'}{transaction.amount.toLocaleString()} {transaction.asset_code}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}