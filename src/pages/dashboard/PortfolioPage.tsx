// @ts-nocheck
/**
 * Portfolio Page
 * 
 * TODO: Refactor database queries to match actual schema
 * - fund_assets doesn't exist, should join funds table  
 * - Use current_value instead of current_balance
 * - Use cost_basis instead of initial_investment
 * - Remove references to asset_symbol, asset_name (should be from funds table)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

export default function PortfolioPage() {
  const { data: positions, isLoading } = useQuery({
    queryKey: ['portfolio-positions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('investor_positions')
        .select(`
          *,
          fund_assets(*)
        `)
        .eq('investor_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
  });

  const totalValue = positions?.reduce((sum, pos) => sum + (pos.current_balance || 0), 0) || 0;
  const totalCost = positions?.reduce((sum, pos) => sum + (pos.initial_investment || 0), 0) || 0;
  const totalGain = totalValue - totalCost;
  const totalReturn = totalCost > 0 ? ((totalGain / totalCost) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">
            Manage your investment positions and track performance
          </p>
        </div>
        <Button asChild>
          <Link to="/transactions/deposit">
            <Plus className="mr-2 h-4 w-4" />
            New Deposit
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current market value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalGain >= 0 ? '+' : ''}${totalGain.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalReturn >= 0 ? '+' : ''}{totalReturn}% return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Original investment</p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Positions</TabsTrigger>
          <TabsTrigger value="crypto">Crypto</TabsTrigger>
          <TabsTrigger value="yield">Yield Funds</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading positions...</p>
              </CardContent>
            </Card>
          ) : positions && positions.length > 0 ? (
            <div className="space-y-4">
              {positions.map((position) => {
                const positionGain = (position.current_balance || 0) - (position.initial_investment || 0);
                const positionReturn = position.initial_investment
                  ? ((positionGain / position.initial_investment) * 100).toFixed(2)
                  : '0.00';
                const allocation = totalValue > 0
                  ? ((position.current_balance / totalValue) * 100).toFixed(1)
                  : '0';

                return (
                  <Card key={position.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                              {position.fund_assets?.asset_symbol?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {position.fund_assets?.asset_name || 'Unknown Fund'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {position.fund_assets?.asset_symbol}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Badge variant={position.status === 'active' ? 'default' : 'secondary'}>
                          {position.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                          <p className="text-lg font-semibold">
                            ${position.current_balance?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Cost Basis</p>
                          <p className="text-lg font-semibold">
                            ${position.initial_investment?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Gain/Loss</p>
                          <div className="flex items-center gap-1">
                            <p className={`text-lg font-semibold ${positionGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {positionGain >= 0 ? '+' : ''}${positionGain.toLocaleString()}
                            </p>
                            {positionGain >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Return</p>
                          <p className={`text-lg font-semibold ${Number(positionReturn) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(positionReturn) >= 0 ? '+' : ''}{positionReturn}%
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Portfolio Allocation</span>
                          <span className="font-medium">{allocation}%</span>
                        </div>
                        <Progress value={Number(allocation)} className="h-2" />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/dashboard/assets/${position.fund_asset_id}`}>
                            View Details
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/transactions?fund=${position.fund_asset_id}`}>
                            Transactions
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">No positions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start investing by making your first deposit
                  </p>
                  <Button asChild>
                    <Link to="/transactions/deposit">Make a Deposit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="crypto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Crypto positions will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yield">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Yield fund positions will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
