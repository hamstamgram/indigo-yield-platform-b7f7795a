import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Scale, AlertTriangle, CheckCircle, Clock, RefreshCw, FileText, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReconciliationReport {
  id: string;
  report_date: string;
  fund_id?: string;
  total_nav: number;
  total_positions: number;
  variance: number;
  variance_percentage: number;
  discrepancies: any[];
  status: string;
  notes?: string;
  created_at: string;
  reviewed_at?: string;
  funds?: {
    name: string;
    code: string;
  };
}

interface Fund {
  id: string;
  name: string;
  code: string;
  status: string;
}

const AdminReconciliationPage = () => {
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedFund, setSelectedFund] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch reconciliation reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reconciliation_reports')
        .select(`
          *,
          funds (
            name,
            code
          )
        `)
        .order('report_date', { ascending: false })
        .limit(50);

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

      // Fetch funds
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('id, name, code, status')
        .eq('status', 'active')
        .order('name');

      if (fundsError) throw fundsError;
      setFunds(fundsData || []);

    } catch (error: any) {
      console.error('Error fetching reconciliation data:', error);
      toast({
        title: 'Error loading data',
        description: error.message || 'Failed to load reconciliation reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReconciliation = async () => {
    try {
      setGenerating(true);

      const { data, error } = await supabase.rpc('generate_daily_reconciliation', {
        p_date: selectedDate
      });

      if (error) throw error;

      toast({
        title: 'Reconciliation generated',
        description: `Generated reconciliation for ${data.funds_processed} funds`,
      });

      // Refresh reports
      await fetchData();

    } catch (error: any) {
      console.error('Error generating reconciliation:', error);
      toast({
        title: 'Error generating reconciliation',
        description: error.message || 'Failed to generate reconciliation report',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('reconciliation_reports')
        .update({
          status,
          notes,
          reviewed_at: status !== 'pending' ? new Date().toISOString() : null,
          reviewed_by: status !== 'pending' ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Report updated',
        description: `Report status updated to ${status}`,
      });

      await fetchData();

    } catch (error: any) {
      console.error('Error updating report:', error);
      toast({
        title: 'Error updating report',
        description: error.message || 'Failed to update report status',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'review':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'default';
      case 'review':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getVarianceColor = (variance: number) => {
    const absVariance = Math.abs(variance);
    if (absVariance < 100) return 'text-green-600';
    if (absVariance < 1000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredReports = selectedFund === 'all' 
    ? reports 
    : reports.filter(r => r.fund_id === selectedFund);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
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
            <Scale className="h-8 w-8 text-primary" />
            Reconciliation
          </h1>
          <p className="text-muted-foreground">Monitor and resolve fund reconciliation discrepancies</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate New Reconciliation</CardTitle>
          <CardDescription>
            Generate daily reconciliation reports for fund positions vs NAV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Report Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
            </div>
            
            <Button 
              onClick={generateReconciliation}
              disabled={generating}
              className="flex items-center gap-2"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {reports.filter(r => r.status === 'pending' || r.status === 'review').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reports.filter(r => r.status === 'resolved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Large Variances</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {reports.filter(r => Math.abs(r.variance) > 1000).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Over $1,000
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Reconciliation Reports</CardTitle>
              <CardDescription>Daily reconciliation results and variance analysis</CardDescription>
            </div>
            
            <Select value={selectedFund} onValueChange={setSelectedFund}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Funds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">NAV Total</TableHead>
                  <TableHead className="text-right">Positions Total</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Variance %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(report.report_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.funds?.name || 'All Funds'}</div>
                        <div className="text-sm text-muted-foreground">{report.funds?.code}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${report.total_nav.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${report.total_positions.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getVarianceColor(report.variance)}`}>
                      {report.variance >= 0 ? '+' : ''}${report.variance.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getVarianceColor(report.variance)}`}>
                      {report.variance_percentage >= 0 ? '+' : ''}{report.variance_percentage.toFixed(4)}%
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(report.status)}
                        <Badge variant={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>Reconciliation Report Review</DialogTitle>
                            <DialogDescription>
                              Review and update the status of this reconciliation report
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Report Date</Label>
                                <div className="text-sm font-medium">
                                  {new Date(report.report_date).toLocaleDateString()}
                                </div>
                              </div>
                              <div>
                                <Label>Fund</Label>
                                <div className="text-sm font-medium">
                                  {report.funds?.name || 'All Funds'}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>NAV Total</Label>
                                <div className="text-sm font-medium">
                                  ${report.total_nav.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <Label>Positions Total</Label>
                                <div className="text-sm font-medium">
                                  ${report.total_positions.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Variance</Label>
                                <div className={`text-sm font-medium ${getVarianceColor(report.variance)}`}>
                                  {report.variance >= 0 ? '+' : ''}${report.variance.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <Label>Variance %</Label>
                                <div className={`text-sm font-medium ${getVarianceColor(report.variance)}`}>
                                  {report.variance_percentage >= 0 ? '+' : ''}{report.variance_percentage.toFixed(4)}%
                                </div>
                              </div>
                            </div>

                            {report.notes && (
                              <div>
                                <Label>Notes</Label>
                                <div className="text-sm p-2 bg-gray-50 rounded">
                                  {report.notes}
                                </div>
                              </div>
                            )}

                            <div className="flex justify-end space-x-2 pt-4">
                              <Button
                                variant="outline"
                                onClick={() => updateReportStatus(report.id, 'review', 'Marked for review')}
                                disabled={report.status === 'review'}
                              >
                                Mark for Review
                              </Button>
                              <Button
                                onClick={() => updateReportStatus(report.id, 'resolved', 'Variance reviewed and resolved')}
                                disabled={report.status === 'resolved'}
                              >
                                Mark Resolved
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredReports.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reconciliation reports found</p>
                <p className="text-sm">Generate your first reconciliation report above</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReconciliationPage;