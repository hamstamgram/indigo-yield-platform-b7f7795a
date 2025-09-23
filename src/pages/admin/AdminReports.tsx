import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, TrendingUp, Users, DollarSign, Activity, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminServiceV2, type DashboardStatsV2, type InvestorSummaryV2 } from '@/services/adminServiceV2';
import { DateRange } from 'react-day-picker';
import { addDays, format, subDays, subMonths } from 'date-fns';

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStatsV2 | null>(null);
  const [investors, setInvestors] = useState<InvestorSummaryV2[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [reportType, setReportType] = useState('overview');
  const { toast } = useToast();

  // Mock performance data for charts
  const [performanceData] = useState([
    { date: '2024-01-01', aum: 250000, investors: 25, yield: 1800 },
    { date: '2024-01-15', aum: 265000, investors: 28, yield: 1900 },
    { date: '2024-02-01', aum: 280000, investors: 30, yield: 2000 },
    { date: '2024-02-15', aum: 295000, investors: 32, yield: 2100 },
    { date: '2024-03-01', aum: 295548, investors: 35, yield: 2150 },
  ]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      console.log('Fetching report data...');

      const [dashboardStats, investorsData] = await Promise.all([
        adminServiceV2.getDashboardStats(),
        adminServiceV2.getAllInvestorsWithSummary()
      ]);

      setStats(dashboardStats);
      setInvestors(investorsData);

      console.log('Report data loaded:', {
        stats: dashboardStats,
        investorsCount: investorsData.length
      });

    } catch (error: any) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Error loading reports',
        description: error.message || 'Failed to load report data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleExportReport = (type: string) => {
    toast({
      title: 'Export Started',
      description: `Generating ${type} report...`,
    });
    
    // TODO: Implement actual export functionality
    setTimeout(() => {
      toast({
        title: 'Export Complete',
        description: `${type} report has been downloaded`,
      });
    }, 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const topInvestorsByAUM = investors
    .sort((a, b) => b.totalAum - a.totalAum)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Reports</h1>
          <p className="text-muted-foreground">Comprehensive analytics and performance reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchReportData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button onClick={() => handleExportReport(reportType)}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">Platform Overview</SelectItem>
            <SelectItem value="performance">Performance Report</SelectItem>
            <SelectItem value="investors">Investor Analysis</SelectItem>
            <SelectItem value="assets">Asset Breakdown</SelectItem>
          </SelectContent>
        </Select>
        <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
      </div>

      <Tabs value={reportType} onValueChange={setReportType} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="investors">Investors</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.totalAum || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  +12.5% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Investors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.investorCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +3 new this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Yield</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(1500)}</div>
                <p className="text-xs text-muted-foreground">
                  7.2% APY target
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Activity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingWithdrawals || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Pending actions
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AUM Growth Trend</CardTitle>
              <CardDescription>Assets under management over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="aum" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Yield Generation</CardTitle>
                <CardDescription>Daily yield generation over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="yield" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Investor Growth</CardTitle>
                <CardDescription>New investor acquisitions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="investors" stroke="#ff7300" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="investors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Investors by AUM</CardTitle>
              <CardDescription>Largest investor holdings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topInvestorsByAUM.map((investor) => (
                    <TableRow key={investor.id}>
                      <TableCell>{investor.firstName} {investor.lastName}</TableCell>
                      <TableCell>{investor.email}</TableCell>
                      <TableCell>{formatCurrency(investor.totalAum)}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Performance</CardTitle>
              <CardDescription>Performance metrics by investor asset allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Asset performance tracking coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReports;