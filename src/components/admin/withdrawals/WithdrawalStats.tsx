import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WithdrawalStats } from '@/types/withdrawal';
import { AlertCircle, CheckCircle2, Clock, DollarSign, XCircle } from 'lucide-react';

interface WithdrawalStatsProps {
  stats: WithdrawalStats;
  isLoading: boolean;
}

export function WithdrawalStatsComponent({ stats, isLoading }: WithdrawalStatsProps) {
  const statCards = [
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'Approved',
      value: stats.approved,
      icon: CheckCircle2,
      color: 'text-green-600',
    },
    {
      title: 'Processing',
      value: stats.processing,
      icon: AlertCircle,
      color: 'text-blue-600',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'text-green-700',
    },
    {
      title: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-600',
    },
    {
      title: 'Pending Amount',
      value: `$${stats.total_pending_amount.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-primary',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-7 w-20 animate-pulse bg-muted rounded" />
            ) : (
              <div className="text-2xl font-bold">{stat.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
