import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PendingBreakdown {
  deposits: number;
  withdrawals: number;
  investments: number;
}

interface PendingItemsBreakdownProps {
  breakdown: PendingBreakdown;
  isLoading: boolean;
}

export function PendingItemsBreakdown({ breakdown, isLoading }: PendingItemsBreakdownProps) {
  const navigate = useNavigate();

  const items = [
    {
      title: 'Pending Deposits',
      count: breakdown.deposits,
      icon: ArrowDownToLine,
      description: 'Awaiting verification',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin/deposits',
    },
    {
      title: 'Pending Withdrawals',
      count: breakdown.withdrawals,
      icon: ArrowUpFromLine,
      description: 'Awaiting approval',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/admin/withdrawals',
    },
    {
      title: 'Pending Investments',
      count: breakdown.investments,
      icon: TrendingUp,
      description: 'Awaiting processing',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/admin/investments',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const Icon = item.icon;
              const hasPending = item.count > 0;

              return (
                <div
                  key={item.title}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${item.bgColor}`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{item.title}</h4>
                        {hasPending && (
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.bgColor} ${item.color}`}
                          >
                            {item.count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Button
                    variant={hasPending ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => navigate(item.href)}
                    className="gap-2"
                  >
                    {hasPending ? 'Review' : 'View All'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {breakdown.deposits === 0 &&
              breakdown.withdrawals === 0 &&
              breakdown.investments === 0 && (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    All caught up! No pending items.
                  </p>
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
