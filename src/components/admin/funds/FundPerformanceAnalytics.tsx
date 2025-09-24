import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, DollarSign, Percent, Calendar, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listFunds, getFundPerformance, calculateFundReturns, type Fund, type FundKPI } from '@/server/admin.funds';

interface PerformanceData {
  nav_date: string;
  aum: number;
  net_return_pct: number | null;
}

const FundPerformanceAnalytics = () => {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [fundKPI, setFundKPI] = useState<FundKPI | null>(null);
  const [periodReturns, setPeriodReturns] = useState({
    mtd: 0,
    qtd: 0,
    ytd: 0,
    itd: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFunds();
  }, []);

  useEffect(() => {
    if (selectedFund) {
      loadFundPerformance(selectedFund);
    }
  }, [selectedFund]);

  const loadFunds = async () => {
    try {
      const fundsData = await listFunds();
      setFunds(fundsData.filter(f => f.status === 'active'));
      if (fundsData.length > 0) {
        setSelectedFund(fundsData[0].id);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading funds',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFundPerformance = async (fundId: string) => {
    try {
      setLoading(true);
      const performance = await getFundPerformance(fundId);
      
      setFundKPI(performance.kpi);
      setPerformanceData(performance.history);
      
      // Calculate period returns
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      
      const [mtdReturn, qtdReturn, ytdReturn] = await Promise.all([
        calculateFundReturns(fundId, startOfMonth.toISOString().split('T')[0], today.toISOString().split('T')[0]),
        calculateFundReturns(fundId, startOfQuarter.toISOString().split('T')[0], today.toISOString().split('T')[0]),
        calculateFundReturns(fundId, startOfYear.toISOString().split('T')[0], today.toISOString().split('T')[0])
      ]);

      setPeriodReturns({
        mtd: mtdReturn * 100,
        qtd: qtdReturn * 100,
        ytd: ytdReturn * 100,
        itd: performance.kpi.itd_return || 0
      });

    } catch (error: any) {
      toast({
        title: 'Error loading performance data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const selectedFundData = funds.find(f => f.id === selectedFund);

  if (loading && !selectedFund) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Fund Performance Analytics</h2>
          <p className="text-muted-foreground">Comprehensive performance metrics and historical analysis</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedFund} onValueChange={setSelectedFund}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select fund" />
            </SelectTrigger>
            <SelectContent>
              {funds.map(fund => (
                <SelectItem key={fund.id} value={fund.id}>
                  {fund.code} - {fund.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => selectedFund && loadFundPerformance(selectedFund)}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {selectedFundData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {selectedFundData.name} ({selectedFundData.code})
            </CardTitle>
            <CardDescription>
              {selectedFundData.asset} • {selectedFundData.strategy} • Inception: {new Date(selectedFundData.inception_date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(fundKPI?.current_aum || 0)}</div>
                <div className="text-sm text-muted-foreground">Current AUM</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{fundKPI?.active_investors || 0}</div>
                <div className="text-sm text-muted-foreground">Active Investors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedFundData.mgmt_fee_bps / 100}%</div>
                <div className="text-sm text-muted-foreground">Management Fee</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedFundData.perf_fee_bps / 100}%</div>
                <div className="text-sm text-muted-foreground">Performance Fee</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month to Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${periodReturns.mtd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(periodReturns.mtd)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quarter to Date</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${periodReturns.qtd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(periodReturns.qtd)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Year to Date</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${periodReturns.ytd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(periodReturns.ytd)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inception to Date</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${periodReturns.itd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(periodReturns.itd)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>AUM Growth</CardTitle>
            <CardDescription>Assets under management over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 animate-pulse bg-muted rounded"></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="nav_date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value) => [formatCurrency(Number(value)), 'AUM']}
                  />
                  <Line type="monotone" dataKey="aum" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Returns</CardTitle>
            <CardDescription>Daily net returns distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 animate-pulse bg-muted rounded"></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="nav_date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                  />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Daily Return']}
                  />
                  <Bar 
                    dataKey="net_return_pct" 
                    fill="hsl(var(--primary))"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FundPerformanceAnalytics;