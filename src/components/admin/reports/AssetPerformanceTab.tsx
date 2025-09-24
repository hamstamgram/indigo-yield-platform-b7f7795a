import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AssetAllocation {
  asset: string;
  totalValue: number;
  percentage: number;
  investorCount: number;
  performance24h?: number;
}

interface AssetPerformance {
  asset: string;
  currentPrice: number;
  change24h: number;
  change7d: number;
  change30d: number;
  volume24h: number;
  marketCap?: number;
}

interface AssetHistory {
  date: string;
  [key: string]: string | number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

const AssetPerformanceTab = () => {
  const [assetAllocations, setAssetAllocations] = useState<AssetAllocation[]>([]);
  const [assetPerformance, setAssetPerformance] = useState<AssetPerformance[]>([]);
  const [assetHistory, setAssetHistory] = useState<AssetHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAssetData();
  }, []);

  const loadAssetData = async () => {
    try {
      setLoading(true);
      
      // Get asset allocations from investor positions
      const { data: allocations, error: allocError } = await supabase
        .from('investor_positions')
        .select(`
          funds!inner (asset, fund_class),
          current_value,
          investor_id
        `);

      if (allocError) throw allocError;

      // Aggregate by asset
      const assetMap = new Map<string, { totalValue: number; investorIds: Set<string> }>();
      
      allocations?.forEach((position) => {
        const asset = position.funds.asset;
        const existing = assetMap.get(asset) || { totalValue: 0, investorIds: new Set() };
        existing.totalValue += position.current_value;
        existing.investorIds.add(position.investor_id);
        assetMap.set(asset, existing);
      });

      const totalValue = Array.from(assetMap.values()).reduce((sum, item) => sum + item.totalValue, 0);
      
      const allocationsData: AssetAllocation[] = Array.from(assetMap.entries()).map(([asset, data]) => ({
        asset,
        totalValue: data.totalValue,
        percentage: (data.totalValue / totalValue) * 100,
        investorCount: data.investorIds.size,
        performance24h: Math.random() * 10 - 5 // Mock data
      })).sort((a, b) => b.totalValue - a.totalValue);

      setAssetAllocations(allocationsData);

      // Get latest asset prices
      const { data: prices, error: pricesError } = await supabase
        .from('asset_prices')
        .select('*')
        .in('asset_id', allocationsData.map(a => a.asset))
        .order('as_of', { ascending: false });

      if (pricesError) throw pricesError;

      // Get latest price for each asset
      const latestPrices = new Map();
      prices?.forEach(price => {
        if (!latestPrices.has(price.asset_id)) {
          latestPrices.set(price.asset_id, price);
        }
      });

      const performanceData: AssetPerformance[] = allocationsData.map(allocation => {
        const price = latestPrices.get(allocation.asset);
        return {
          asset: allocation.asset,
          currentPrice: price?.price_usd || 0,
          change24h: Math.random() * 10 - 5, // Mock data
          change7d: Math.random() * 20 - 10,
          change30d: Math.random() * 40 - 20,
          volume24h: price?.volume_24h || 0,
          marketCap: price?.market_cap
        };
      });

      setAssetPerformance(performanceData);

      // Generate mock historical data
      const history: AssetHistory[] = [];
      const days = 30;
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const entry: AssetHistory = {
          date: date.toISOString().split('T')[0]
        };
        
        allocationsData.forEach(asset => {
          entry[asset.asset] = Math.random() * 100000 + 50000; // Mock values
        });
        
        history.push(entry);
      }
      
      setAssetHistory(history);

    } catch (error: any) {
      toast({
        title: 'Error loading asset data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-muted rounded animate-pulse"></div>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Total Asset Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(assetAllocations.reduce((sum, asset) => sum + asset.totalValue, 0))}
            </div>
            <p className="text-sm text-muted-foreground">Across {assetAllocations.length} assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Best Performer (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetPerformance.length > 0 && (
              <>
                <div className="text-2xl font-bold">
                  {assetPerformance.reduce((best, asset) => 
                    asset.change24h > best.change24h ? asset : best
                  ).asset}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">
                    {formatPercent(Math.max(...assetPerformance.map(a => a.change24h)))}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Largest Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetAllocations.length > 0 && (
              <>
                <div className="text-2xl font-bold">{assetAllocations[0].asset}</div>
                <p className="text-sm text-muted-foreground">
                  {assetAllocations[0].percentage.toFixed(1)}% of portfolio
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Portfolio distribution by asset</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assetAllocations}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ asset, percentage }) => `${asset} (${percentage.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalValue"
                >
                  {assetAllocations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Value Trends (30D)</CardTitle>
            <CardDescription>Historical asset value performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={assetHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value) => [formatCurrency(Number(value)), 'Value']}
                />
                {assetAllocations.slice(0, 4).map((asset, index) => (
                  <Line 
                    key={asset.asset}
                    type="monotone" 
                    dataKey={asset.asset} 
                    stroke={COLORS[index]} 
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Performance Summary</CardTitle>
          <CardDescription>Price performance and allocation details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>24h Change</TableHead>
                <TableHead>7d Change</TableHead>
                <TableHead>30d Change</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Investors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetAllocations.map((asset) => {
                const performance = assetPerformance.find(p => p.asset === asset.asset);
                return (
                  <TableRow key={asset.asset}>
                    <TableCell className="font-medium">{asset.asset}</TableCell>
                    <TableCell>{formatCurrency(performance?.currentPrice || 0)}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${performance && performance.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {performance && performance.change24h >= 0 ? 
                          <TrendingUp className="h-3 w-3" /> : 
                          <TrendingDown className="h-3 w-3" />
                        }
                        {performance ? formatPercent(performance.change24h) : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${performance && performance.change7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {performance && performance.change7d >= 0 ? 
                          <TrendingUp className="h-3 w-3" /> : 
                          <TrendingDown className="h-3 w-3" />
                        }
                        {performance ? formatPercent(performance.change7d) : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${performance && performance.change30d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {performance && performance.change30d >= 0 ? 
                          <TrendingUp className="h-3 w-3" /> : 
                          <TrendingDown className="h-3 w-3" />
                        }
                        {performance ? formatPercent(performance.change30d) : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.percentage.toFixed(1)}%</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(asset.totalValue)}</TableCell>
                    <TableCell>{asset.investorCount}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetPerformanceTab;