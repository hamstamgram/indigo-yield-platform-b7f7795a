import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownLeft, Filter, Download } from "lucide-react";

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal';
  symbol?: string;
  quantity?: number;
  price?: number;
  amount: number;
  fee?: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading?: boolean;
  onFilter?: () => void;
  onExport?: () => void;
  className?: string;
}

export function TransactionHistory({
  transactions,
  loading = false,
  onFilter,
  onExport,
  className
}: TransactionHistoryProps) {
  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'buy':
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'sell':
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'dividend':
        return <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status]} className="text-xs">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatAmount = (amount: number, type: Transaction['type']) => {
    const prefix = ['buy', 'deposit', 'dividend'].includes(type) ? '+' : '-';
    return `${prefix}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                  <div className="space-y-1">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transaction History</CardTitle>
        <div className="flex space-x-2">
          {onFilter && (
            <Button variant="outline" size="sm" onClick={onFilter}>
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <div className="font-medium flex items-center space-x-2">
                      <span className="capitalize">{transaction.type}</span>
                      {transaction.symbol && (
                        <Badge variant="outline" className="text-xs">
                          {transaction.symbol}
                        </Badge>
                      )}
                      {getStatusBadge(transaction.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(transaction.date), 'MMM dd, yyyy HH:mm')}
                      {transaction.quantity && (
                        <span className="ml-2">
                          {transaction.quantity} shares @ ${transaction.price?.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {transaction.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {transaction.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "font-medium",
                    ['buy', 'deposit', 'dividend'].includes(transaction.type) 
                      ? "text-green-600" 
                      : "text-red-600"
                  )}>
                    {formatAmount(transaction.amount, transaction.type)}
                  </div>
                  {transaction.fee && transaction.fee > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Fee: ${transaction.fee.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}