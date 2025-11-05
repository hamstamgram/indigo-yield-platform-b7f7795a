// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, DollarSign, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const { data: portfolioData, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('investor_positions')
        .select('*, fund_assets(*)')
        .eq('investor_id', user.id);

      if (error) throw error;

      const totalValue = data?.reduce((sum, pos) => sum + (pos.current_balance || 0), 0) || 0;
      const totalGain = data?.reduce((sum, pos) => sum + ((pos.current_balance || 0) - (pos.initial_investment || 0)), 0) || 0;

      return {
        totalValue,
        totalGain,
        positions: data || [],
      };
    },
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('investor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const totalReturn = portfolioData?.totalValue && portfolioData.totalValue > 0
    ? ((portfolioData.totalGain / (portfolioData.totalValue - portfolioData.totalGain)) * 100).toFixed(2)
    : '0.00';

  const mockPerformanceData = [
    { name: 'Jan', value: 10000 },
    { name: 'Feb', value: 12000 },
    { name: 'Mar', value: 11500 },
    { name: 'Apr', value: 13500 },
    { name: 'May', value: 15000 },
    { name: 'Jun', value: 14500 },
  ];

  const allocationData = portfolioData?.positions.map((pos, idx) => ({
    name: pos.fund_assets?.asset_name || 'Unknown',
    value: pos.current_balance || 0,
    color: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981'][idx % 4],
  })) || [];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">
          ${portfolioData?.totalValue.toLocaleString() || '0.00'}
        </h1>
        <p className="text-blue-100 mb-4">Total Portfolio Value</p>
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-blue-100">Today's Change</p>
            <p className="text-2xl font-semibold flex items-center gap-1">
              <TrendingUp className="h-5 w-5" />
              +2.4%
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Total Return</p>
            <p className="text-2xl font-semibold">
              {Number(totalReturn) >= 0 ? '+' : ''}
              {totalReturn}%
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${portfolioData?.totalValue.toLocaleString() || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Across all funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Gain</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${portfolioData?.totalGain.toLocaleString() || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">+{totalReturn}% return</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioData?.positions.length || 0}</div>
            <p className="text-xs text-muted-foreground">Different funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6.5/10</div>
            <p className="text-xs text-muted-foreground">Moderate risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Your portfolio performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Distribution across different funds</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest account activity</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/transactions">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions?.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${
                    txn.transaction_type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {txn.transaction_type === 'deposit' ? (
                      <ArrowDownRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{txn.transaction_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ${Number(txn.amount).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">{txn.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
