import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Send, Calendar, Filter, Download, RefreshCw, Search, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminServiceV2, type InvestorSummaryV2 } from '@/services/adminServiceV2';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface MonthlyReport {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  report_month: string;
  assets: {
    [key: string]: {
      opening_balance: number;
      closing_balance: number;
      additions: number;
      withdrawals: number;
      yield_earned: number;
      daily_tracking: {
        [date: string]: {
          balance: number;
          yield_applied: number;
        };
      };
    };
  };
  total_portfolio_value: number;
  monthly_yield: number;
  report_status: 'draft' | 'ready' | 'sent';
  last_updated: string;
}

const InvestorReports = () => {
  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState<InvestorSummaryV2[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [generatingReports, setGeneratingReports] = useState(false);
  const [sendingReports, setSendingReports] = useState(false);
  const { toast } = useToast();

  const fetchInvestorData = async () => {
    try {
      setLoading(true);
      console.log('Fetching investor data...');

      const investorsData = await adminServiceV2.getAllInvestorsWithSummary();
      setInvestors(investorsData);

      // Generate mock monthly reports data based on real investors
      const mockReports: MonthlyReport[] = investorsData.map((investor, index) => ({
        investor_id: investor.id,
        investor_name: `${investor.firstName} ${investor.lastName}`,
        investor_email: investor.email,
        report_month: selectedMonth,
        assets: {
          'BTC': {
            opening_balance: investor.totalAum * 0.4,
            closing_balance: investor.totalAum * 0.4 * 1.025,
            additions: 0,
            withdrawals: 0,
            yield_earned: investor.totalAum * 0.4 * 0.025,
            daily_tracking: {}
          },
          'ETH': {
            opening_balance: investor.totalAum * 0.35,
            closing_balance: investor.totalAum * 0.35 * 1.03,
            additions: 0,
            withdrawals: 0,
            yield_earned: investor.totalAum * 0.35 * 0.03,
            daily_tracking: {}
          },
          'USDT': {
            opening_balance: investor.totalAum * 0.25,
            closing_balance: investor.totalAum * 0.25 * 1.015,
            additions: 0,
            withdrawals: 0,
            yield_earned: investor.totalAum * 0.25 * 0.015,
            daily_tracking: {}
          }
        },
        total_portfolio_value: investor.totalAum * 1.025,
        monthly_yield: investor.totalAum * 0.025,
        report_status: index % 3 === 0 ? 'sent' : index % 3 === 1 ? 'ready' : 'draft',
        last_updated: new Date().toISOString()
      }));

      setMonthlyReports(mockReports);

    } catch (error: any) {
      console.error('Error fetching investor data:', error);
      toast({
        title: 'Error loading data',
        description: error.message || 'Failed to load investor data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestorData();
  }, [selectedMonth]);

  const handleGenerateReports = async () => {
    setGeneratingReports(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update report status to 'ready'
      setMonthlyReports(prev => prev.map(report => ({
        ...report,
        report_status: 'ready',
        last_updated: new Date().toISOString()
      })));

      toast({
        title: 'Reports Generated',
        description: `Monthly reports for ${format(new Date(selectedMonth), 'MMMM yyyy')} have been generated successfully`,
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate monthly reports',
        variant: 'destructive',
      });
    } finally {
      setGeneratingReports(false);
    }
  };

  const handleSendReports = async () => {
    setSendingReports(true);
    try {
      const readyReports = monthlyReports.filter(r => r.report_status === 'ready');
      
      // Simulate sending reports
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update sent reports status
      setMonthlyReports(prev => prev.map(report => 
        report.report_status === 'ready' 
          ? { ...report, report_status: 'sent', last_updated: new Date().toISOString() }
          : report
      ));

      toast({
        title: 'Reports Sent',
        description: `${readyReports.length} monthly reports have been sent to investors`,
      });
    } catch (error) {
      toast({
        title: 'Send Failed',
        description: 'Failed to send monthly reports',
        variant: 'destructive',
      });
    } finally {
      setSendingReports(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const filteredReports = monthlyReports.filter(report => {
    const matchesSearch = report.investor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.investor_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.report_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const reportStatusCounts = {
    draft: monthlyReports.filter(r => r.report_status === 'draft').length,
    ready: monthlyReports.filter(r => r.report_status === 'ready').length,
    sent: monthlyReports.filter(r => r.report_status === 'sent').length,
    total: monthlyReports.length
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monthly Investor Reports</h1>
          <p className="text-muted-foreground">Generate and send monthly yield reports to investors</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchInvestorData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button 
            onClick={handleGenerateReports} 
            disabled={generatingReports}
            variant="default"
          >
            <FileText className="h-4 w-4 mr-2" />
            {generatingReports ? 'Generating...' : 'Generate Reports'}
          </Button>
          <Button 
            onClick={handleSendReports} 
            disabled={sendingReports || reportStatusCounts.ready === 0}
            variant="default"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendingReports ? 'Sending...' : `Send Reports (${reportStatusCounts.ready})`}
          </Button>
        </div>
      </div>

      {/* Report Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStatusCounts.total}</div>
            <p className="text-xs text-muted-foreground">
              For {format(new Date(selectedMonth), 'MMMM yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Reports</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{reportStatusCounts.draft}</div>
            <p className="text-xs text-muted-foreground">
              Pending generation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Send</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reportStatusCounts.ready}</div>
            <p className="text-xs text-muted-foreground">
              Generated and ready
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Reports</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{reportStatusCounts.sent}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const date = subMonths(new Date(), i);
              const monthValue = format(date, 'yyyy-MM');
              return (
                <SelectItem key={monthValue} value={monthValue}>
                  {format(date, 'MMMM yyyy')}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search investors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Reports - {format(new Date(selectedMonth), 'MMMM yyyy')}</CardTitle>
          <CardDescription>
            Track and manage monthly yield reports for all investors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Portfolio Value</TableHead>
                <TableHead>Monthly Yield</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.investor_id}>
                  <TableCell className="font-medium">{report.investor_name}</TableCell>
                  <TableCell>{report.investor_email}</TableCell>
                  <TableCell>{formatCurrency(report.total_portfolio_value)}</TableCell>
                  <TableCell className="text-green-600 font-medium">
                    {formatCurrency(report.monthly_yield)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(report.assets).map(asset => (
                        <Badge key={asset} variant="secondary" className="text-xs">
                          {asset}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        report.report_status === 'sent' ? 'default' :
                        report.report_status === 'ready' ? 'secondary' :
                        'outline'
                      }
                    >
                      {report.report_status.charAt(0).toUpperCase() + report.report_status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(report.last_updated), 'MMM d, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestorReports;