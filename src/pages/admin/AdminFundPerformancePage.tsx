import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Percent, Target, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Fund {
  id: string;
  name: string;
  code: string;
  fund_class: string;
  asset: string;
  status: string;
  inception_date: string;
}

interface PerformanceMetric {
  id: string;
  fund_id: string;
  metric_date: string;
  aum: number;
  nav_per_share?: number;
  daily_return_pct?: number;
  mtd_return_pct?: number;
  qtd_return_pct?: number;
  ytd_return_pct?: number;
  inception_return_pct?: number;
  sharpe_ratio?: number;
  max_drawdown_pct?: number;
  volatility_pct?: number;
}

interface NavData {
  nav_date: string;
  aum: number;
  nav_per_share?: number;
  net_return_pct?: number;
  gross_return_pct?: number;
  shares_outstanding?: number;
  investor_count?: number;
}

const AdminFundPerformancePage = () => {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>('');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [navData, setNavData] = useState<NavData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFunds();
  }, []);

  useEffect(() => {
    if (selectedFund) {
      fetchFundData();
    }
  }, [selectedFund]);

  const fetchFunds = async () => {
    try {
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .order('name');

      if (error) throw error;

      setFunds(data || []);
      if (data && data.length > 0 && !selectedFund) {
        setSelectedFund(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching funds:', error);
      toast({
        title: 'Error loading funds',
        description: error.message || 'Failed to load fund data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFundData = async () => {
    if (!selectedFund) return;

    try {
      setRefreshing(true);

      // Fetch performance metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('fund_performance_metrics')
        .select('*')
        .eq('fund_id', selectedFund)
        .order('metric_date', { ascending: false })
        .limit(30);

      if (metricsError) throw metricsError;
      setPerformanceMetrics(metricsData || []);

      // Fetch NAV data
      const { data: navDataResult, error: navError } = await supabase
        .from('daily_nav')
        .select('*')
        .eq('fund_id', selectedFund)
        .order('nav_date', { ascending: false })
        .limit(90);

      if (navError) throw navError;
      setNavData(navDataResult || []);

    } catch (error: any) {
      console.error('Error fetching fund data:', error);
      toast({
        title: 'Error loading fund data',
        description: error.message || 'Failed to load performance data',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const calculateSummaryMetrics = () => {
    if (!navData.length) return null;

    const latestNav = navData[0];
    const currentAUM = latestNav.aum || 0;
    const investorCount = latestNav.investor_count || 0;
    
    // Calculate returns from nav data
    const ytdData = navData.filter(nav => 
      new Date(nav.nav_date).getFullYear() === new Date().getFullYear()
    );
    
    const ytdReturn = ytdData.length > 1 ? 
      ytdData.reduce((sum, nav) => sum + (nav.net_return_pct || 0), 0) : 0;

    const mtdData = navData.filter(nav => {
      const navDate = new Date(nav.nav_date);
      const now = new Date();
      return navDate.getFullYear() === now.getFullYear() && 
             navDate.getMonth() === now.getMonth();
    });

    const mtdReturn = mtdData.length > 1 ?
      mtdData.reduce((sum, nav) => sum + (nav.net_return_pct || 0), 0) : 0;

    return {
      currentAUM,
      investorCount,
      ytdReturn,
      mtdReturn,
      navPerShare: latestNav.nav_per_share || 0,
      sharesOutstanding: latestNav.shares_outstanding || 0
    };
  };

  const selectedFundData = funds.find(f => f.id === selectedFund);
  const summaryMetrics = calculateSummaryMetrics();

  const chartData = navData.slice().reverse().map(nav => ({
    date: new Date(nav.nav_date).toLocaleDateString(),
    aum: nav.aum / 1000000, // Convert to millions
    navPerShare: nav.nav_per_share || 1,
    returnPct: nav.net_return_pct || 0
  }));

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Fund Performance
          </h1>
          <p className="text-muted-foreground">Monitor fund performance metrics and analytics</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedFund} onValueChange={setSelectedFund}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a fund" />
            </SelectTrigger>
            <SelectContent>
              {funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>
                  {fund.name} ({fund.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={fetchFundData} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {selectedFundData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedFundData.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedFundData.fund_class}</Badge>
                <Badge variant={selectedFundData.status === 'active' ? 'default' : 'secondary'}>
                  {selectedFundData.status}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Asset: {selectedFundData.asset} • Inception: {new Date(selectedFundData.inception_date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {summaryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current AUM</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${summaryMetrics.currentAUM.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {summaryMetrics.sharesOutstanding.toLocaleString()} shares outstanding
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Investors</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.investorCount}</div>
              <p className="text-xs text-muted-foreground">
                NAV: ${summaryMetrics.navPerShare.toFixed(4)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">YTD Return</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                summaryMetrics.ytdReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summaryMetrics.ytdReturn >= 0 ? '+' : ''}
                {summaryMetrics.ytdReturn.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">Year to date</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MTD Return</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                summaryMetrics.mtdReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summaryMetrics.mtdReturn >= 0 ? '+' : ''}
                {summaryMetrics.mtdReturn.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">Month to date</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>AUM Growth</CardTitle>
            <CardDescription>Assets under management over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `$${value.toFixed(2)}M`,
                    'AUM (Millions)'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="aum" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Returns</CardTitle>
            <CardDescription>Daily performance percentages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`${value.toFixed(4)}%`, 'Return']}
                />
                <Bar 
                  dataKey="returnPct" 
                  fill={(entry: any) => entry?.returnPct >= 0 ? '#10b981' : '#ef4444'}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NAV Per Share History</CardTitle>
          <CardDescription>Net asset value per share over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`$${value.toFixed(4)}`, 'NAV per Share']}
              />
              <Line 
                type="monotone" 
                dataKey="navPerShare" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {navData.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No performance data available for this fund</p>
            <p className="text-sm text-muted-foreground">
              Performance data will appear once NAV entries are recorded
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminFundPerformancePage;