import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTokenBalance, getSupportedTokens } from '@/utils/tokenFormatting';
import { Calendar, Download, Upload, Search, Filter } from 'lucide-react';

interface ReportSummary {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  report_month: string;
  asset_code: string;
  closing_balance: number;
  yield_earned: number;
  last_updated: string;
  total_reports: number;
}

const HistoricalReportsDashboard: React.FC = () => {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');

  useEffect(() => {
    fetchReportsSummary();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, selectedMonth, selectedAsset]);

  const fetchReportsSummary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('investor_monthly_reports')
        .select(`
          *,
          investors!inner(
            id,
            name,
            email
          )
        `)
        .order('report_month', { ascending: false })
        .order('investor_id');

      if (error) throw error;

      // Transform data for display
      const summaryData: ReportSummary[] = (data || []).map(report => ({
        investor_id: report.investor_id,
        investor_name: report.investors.name,
        investor_email: report.investors.email,
        report_month: report.report_month,
        asset_code: report.asset_code,
        closing_balance: report.closing_balance,
        yield_earned: report.yield_earned,
        last_updated: report.updated_at,
        total_reports: 1 // Will be aggregated if needed
      }));

      setReports(summaryData);
    } catch (error) {
      console.error('Error fetching reports summary:', error);
      toast.error('Failed to fetch reports summary');
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.investor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.investor_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedMonth) {
      filtered = filtered.filter(report => report.report_month === selectedMonth);
    }

    if (selectedAsset) {
      filtered = filtered.filter(report => report.asset_code === selectedAsset);
    }

    setFilteredReports(filtered);
  };

  const generateAllMonthlyTemplates = async () => {
    if (!selectedMonth) {
      toast.error('Please select a month to generate templates for');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('generate_monthly_report_template', {
        p_month: selectedMonth,
        p_investor_id: null // Generate for all investors
      });

      if (error) throw error;
      toast.success('Monthly templates generated for all investors');
      fetchReportsSummary();
    } catch (error) {
      console.error('Error generating templates:', error);
      toast.error('Failed to generate monthly templates');
    }
  };

  const exportReports = async () => {
    try {
      const { data, error } = await supabase
        .from('investor_monthly_reports')
        .select(`
          *,
          investors!inner(name, email)
        `)
        .csv();

      if (error) throw error;

      // Create and download CSV file
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historical_reports_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Reports exported successfully');
    } catch (error) {
      console.error('Error exporting reports:', error);
      toast.error('Failed to export reports');
    }
  };

  const getMonthOptions = () => {
    const months = [];
    const start = new Date('2024-06-01');
    const end = new Date();
    
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}-01`;
      const label = `${d.toLocaleString('default', { month: 'long' })} ${year}`;
      months.push({ value, label });
    }
    
    return months.reverse();
  };

  // Group reports by investor for summary display
  const reportsByInvestor = filteredReports.reduce((acc, report) => {
    const key = report.investor_id;
    if (!acc[key]) {
      acc[key] = {
        investor: {
          id: report.investor_id,
          name: report.investor_name,
          email: report.investor_email
        },
        reports: [],
        totalBalance: 0,
        totalYield: 0
      };
    }
    acc[key].reports.push(report);
    acc[key].totalBalance += report.closing_balance;
    acc[key].totalYield += report.yield_earned;
    return acc;
  }, {} as Record<string, any>);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Historical Reports Dashboard</CardTitle>
          <div className="flex gap-2">
            <Button onClick={exportReports} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generateAllMonthlyTemplates} disabled={!selectedMonth}>
              <Calendar className="h-4 w-4 mr-2" />
              Generate All Templates
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by investor name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Assets</SelectItem>
                {getSupportedTokens().map(token => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedMonth('');
                setSelectedAsset('');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{Object.keys(reportsByInvestor).length}</div>
                <p className="text-sm text-muted-foreground">Active Investors</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{filteredReports.length}</div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {Object.values(reportsByInvestor).reduce((sum: number, inv: any) => sum + inv.totalYield, 0).toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Total Yield Tracked</p>
              </CardContent>
            </Card>
          </div>

          {/* Reports Table */}
          {loading ? (
            <div className="text-center py-8">Loading reports...</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Closing Balance</TableHead>
                    <TableHead>Yield Earned</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report, index) => (
                    <TableRow key={`${report.investor_id}-${report.report_month}-${report.asset_code}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.investor_name}</p>
                          <p className="text-sm text-muted-foreground">{report.investor_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(report.report_month).toLocaleString('default', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.asset_code}</Badge>
                      </TableCell>
                      <TableCell>
                        {formatTokenBalance(report.closing_balance, report.asset_code)}
                      </TableCell>
                      <TableCell>
                        {formatTokenBalance(report.yield_earned, report.asset_code)}
                      </TableCell>
                      <TableCell>
                        {new Date(report.last_updated).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredReports.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No reports found matching your criteria.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoricalReportsDashboard;