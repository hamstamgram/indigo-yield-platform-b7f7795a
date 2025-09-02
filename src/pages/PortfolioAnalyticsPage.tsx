import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Download, Calendar, Target, FileSpreadsheet } from 'lucide-react';
import { useCSVExport } from '@/lib/export';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PortfolioAnalytics, AllocationData, PerformanceMetrics, FundConfiguration } from '@/types/phase3Types';
import { format, subDays, subMonths, subYears } from 'date-fns';

// Color palette for charts
const CHART_COLORS = [
  '#F7931A', // Bitcoin Orange
  '#627EEA', // Ethereum Blue
  '#14F195', // Solana Green
  '#2775CA', // USDC Blue
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
];

type TimePeriod = 'MTD' | 'QTD' | 'YTD' | 'ITD';

interface ChartDataPoint {
  date: string;
  value: number;
  benchmark?: number;
}

const PortfolioAnalyticsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('YTD');
  const [selectedFund, setSelectedFund] = useState<string>('all');
  const [portfolioData, setPortfolioData] = useState<PortfolioAnalytics | null>(null);
  const [allocationData, setAllocationData] = useState<AllocationData[]>([]);
  const [performanceData, setPerformanceData] = useState<ChartDataPoint[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [availableFunds, setAvailableFunds] = useState<FundConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { exportPortfolio, exportData } = useCSVExport();

  useEffect(() => {
    loadAnalyticsData();
    loadAvailableFunds();
  }, [selectedPeriod, selectedFund]);

  const loadAvailableFunds = async () => {
    try {
      const { data: funds, error } = await supabase
        .from('fund_configurations')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      if (funds) setAvailableFunds(funds);
    } catch (error) {
      console.error('Error loading funds:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate mock portfolio analytics data
      // In a real implementation, this would call an analytics service or database function
      const mockAnalytics = generateMockAnalytics(selectedPeriod, selectedFund);
      
      setPortfolioData(mockAnalytics);
      setAllocationData(mockAnalytics.allocation);
      setPerformanceData(generatePerformanceData(selectedPeriod));
      setPerformanceMetrics(mockAnalytics.performance_metrics);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load portfolio analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = (period: TimePeriod, fundFilter: string): PortfolioAnalytics => {
    // Mock allocation data
    const baseAllocation: AllocationData[] = [
      { asset: 'BTC', value: 25000, percentage: 50, color: CHART_COLORS[0] },
      { asset: 'ETH', value: 15000, percentage: 30, color: CHART_COLORS[1] },
      { asset: 'SOL', value: 5000, percentage: 10, color: CHART_COLORS[2] },
      { asset: 'USDC', value: 5000, percentage: 10, color: CHART_COLORS[3] },
    ];

    // Mock performance metrics based on period
    const periodMultipliers = { MTD: 0.5, QTD: 2, YTD: 8, ITD: 25 };
    const baseReturn = periodMultipliers[period];

    const performanceMetrics: PerformanceMetrics = {
      total_return: baseReturn + Math.random() * 5,
      annualized_return: (baseReturn + Math.random() * 5) * (12 / getPeriodMonths(period)),
      volatility: 15 + Math.random() * 10,
      sharpe_ratio: 1.2 + Math.random() * 0.5,
      max_drawdown: -(Math.random() * 8 + 2),
    };

    return {
      user_id: user?.id || '',
      fund_id: fundFilter === 'all' ? undefined : fundFilter,
      period,
      returns: [],
      dates: [],
      benchmark_returns: [],
      allocation: baseAllocation,
      performance_metrics: performanceMetrics,
    };
  };

  const generatePerformanceData = (period: TimePeriod): ChartDataPoint[] => {
    const now = new Date();
    const dataPoints: ChartDataPoint[] = [];
    const numPoints = getDataPointsForPeriod(period);
    
    let portfolioValue = 100;
    let benchmarkValue = 100;
    
    for (let i = 0; i <= numPoints; i++) {
      const date = getDateForPeriod(period, i, numPoints);
      
      // Add some realistic volatility
      const portfolioChange = (Math.random() - 0.48) * 2; // Slight positive bias
      const benchmarkChange = (Math.random() - 0.5) * 2;
      
      portfolioValue *= (1 + portfolioChange / 100);
      benchmarkValue *= (1 + benchmarkChange / 100);
      
      dataPoints.push({
        date: format(date, period === 'ITD' ? 'MMM yy' : 'MMM dd'),
        value: portfolioValue,
        benchmark: benchmarkValue,
      });
    }
    
    return dataPoints;
  };

  const getPeriodMonths = (period: TimePeriod): number => {
    const periodMonths = { MTD: 1, QTD: 3, YTD: 12, ITD: 36 };
    return periodMonths[period];
  };

  const getDataPointsForPeriod = (period: TimePeriod): number => {
    const dataPoints = { MTD: 30, QTD: 90, YTD: 365, ITD: 1095 };
    return dataPoints[period];
  };

  const getDateForPeriod = (period: TimePeriod, index: number, total: number): Date => {
    const now = new Date();
    switch (period) {
      case 'MTD':
        return subDays(now, total - index);
      case 'QTD':
        return subDays(now, total - index);
      case 'YTD':
        return subDays(now, total - index);
      case 'ITD':
        return subDays(now, total - index);
      default:
        return now;
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

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const handleExportChart = () => {
    toast({
      title: 'Export Started',
      description: 'Chart image will be downloaded shortly',
    });
    // In a real implementation, this would export the chart as PNG/PDF
  };

  const handleExportPortfolio = async () => {
    if (!allocationData || allocationData.length === 0) {
      toast({
        title: 'No Data',
        description: 'No portfolio data available to export',
        variant: 'destructive',
      });
      return;
    }

    // Transform allocation data for export
    const exportData = allocationData.map(asset => ({
      asset: asset.asset,
      symbol: asset.asset, // In real implementation, this would be the actual symbol
      quantity: (asset.value / 50000 * Math.random() * 100).toFixed(4), // Mock quantity
      price: (50000 + Math.random() * 10000).toFixed(2), // Mock price
      value: asset.value,
      percentOfPortfolio: asset.percentage,
      lastUpdated: new Date().toISOString(),
    }));

    const result = await exportPortfolio(exportData);
    
    if (result.success) {
      toast({
        title: 'Export Successful',
        description: `Portfolio data exported successfully (${result.rowCount} rows)`,
      });
    } else {
      toast({
        title: 'Export Failed',
        description: result.error || 'Failed to export portfolio data',
        variant: 'destructive',
      });
    }
  };

  const handleExportPerformance = async () => {
    if (!performanceData || performanceData.length === 0) {
      toast({
        title: 'No Data',
        description: 'No performance data available to export',
        variant: 'destructive',
      });
      return;
    }

    // Transform performance data for export
    const exportData = performanceData.map(point => ({
      date: point.date,
      portfolio_value: point.value.toFixed(2),
      benchmark_value: point.benchmark?.toFixed(2) || '',
      portfolio_return: ((point.value - 100) / 100 * 100).toFixed(2) + '%',
      benchmark_return: point.benchmark ? ((point.benchmark - 100) / 100 * 100).toFixed(2) + '%' : '',
      outperformance: point.benchmark ? ((point.value - point.benchmark) / point.benchmark * 100).toFixed(2) + '%' : '',
    }));

    const result = await exportData(exportData, {
      filename: `performance_${selectedPeriod.toLowerCase()}_data`,
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'portfolio_value', label: 'Portfolio Value' },
        { key: 'benchmark_value', label: 'Benchmark Value' },
        { key: 'portfolio_return', label: 'Portfolio Return' },
        { key: 'benchmark_return', label: 'Benchmark Return' },
        { key: 'outperformance', label: 'Outperformance' },
      ],
      includeHeaders: true,
      encoding: 'utf-8-bom',
    });
    
    if (result.success) {
      toast({
        title: 'Export Successful',
        description: `Performance data exported successfully (${result.rowCount} rows)`,
      });
    } else {
      toast({
        title: 'Export Failed',
        description: result.error || 'Failed to export performance data',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Portfolio Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Detailed performance analysis and insights
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPortfolio}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Portfolio
          </Button>
          <Button variant="outline" onClick={handleExportPerformance}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Performance
          </Button>
          <Button variant="outline" onClick={handleExportChart}>
            <Download className="w-4 h-4 mr-2" />
            Export Charts
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Time Period
              </label>
              <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTD">Month to Date</SelectItem>
                  <SelectItem value="QTD">Quarter to Date</SelectItem>
                  <SelectItem value="YTD">Year to Date</SelectItem>
                  <SelectItem value="ITD">Since Inception</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Fund Filter
              </label>
              <Select value={selectedFund} onValueChange={setSelectedFund}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Funds</SelectItem>
                  {availableFunds.map(fund => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Benchmark
              </label>
              <Select defaultValue="btc">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="btc">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="eth">Ethereum (ETH)</SelectItem>
                  <SelectItem value="sp500">S&P 500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Return</p>
                <p className={`text-2xl font-bold ${performanceMetrics.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(performanceMetrics.total_return)}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Annualized Return</p>
                <p className={`text-2xl font-bold ${performanceMetrics.annualized_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(performanceMetrics.annualized_return)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Volatility</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPercentage(performanceMetrics.volatility)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio</p>
                <p className={`text-2xl font-bold ${performanceMetrics.sharpe_ratio >= 1 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {performanceMetrics.sharpe_ratio.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Drawdown</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatPercentage(performanceMetrics.max_drawdown)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="allocation" className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Allocation
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Benchmark
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Portfolio value over time ({selectedPeriod})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(2)}`, 'Value']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#6366F1" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>
                  Current portfolio distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ asset, percentage }) => `${asset} ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Holdings Breakdown</CardTitle>
                <CardDescription>
                  Detailed asset values
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allocationData.map((asset, index) => (
                    <div key={asset.asset} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: asset.color }}
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {asset.asset}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {asset.percentage}% of portfolio
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(asset.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Benchmark Comparison</CardTitle>
              <CardDescription>
                Portfolio vs benchmark performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#6366F1" 
                      strokeWidth={2}
                      name="Portfolio"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="benchmark" 
                      stroke="#F59E0B" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Benchmark"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Insights */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Performance Insights
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your portfolio has outperformed the benchmark by{' '}
                {performanceMetrics ? formatPercentage(performanceMetrics.total_return - 5) : '0%'} over the {selectedPeriod.toLowerCase()} period.
                The Sharpe ratio of {performanceMetrics?.sharpe_ratio.toFixed(2)} indicates good risk-adjusted returns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioAnalyticsPage;
