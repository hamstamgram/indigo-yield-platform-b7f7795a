/**
 * Reports Dashboard Page
 * Overview of all available reports and recent reports
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  TrendingUp,
  Receipt,
  Calendar,
  Settings,
  Download,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/context';
import { ReportsApi } from '@/services/api/reportsApi';
import { GeneratedReport } from '@/types/reports';
import { format } from 'date-fns';

export default function ReportsDashboard() {
  const { user } = useAuth();
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentReports();
  }, [user]);

  const loadRecentReports = async () => {
    try {
      const reports = await ReportsApi.getUserReports({ limit: 5 });
      setRecentReports(reports);
    } catch (error) {
      console.error('Failed to load recent reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    {
      title: 'Portfolio Performance',
      description: 'Detailed analysis of your investment performance',
      icon: TrendingUp,
      href: '/reports/portfolio-performance',
      color: 'bg-blue-500',
    },
    {
      title: 'Tax Report',
      description: 'Generate tax documents (1099) for the year',
      icon: Receipt,
      href: '/reports/tax-report',
      color: 'bg-green-500',
    },
    {
      title: 'Monthly Statement',
      description: 'View detailed monthly account statements',
      icon: Calendar,
      href: '/reports/monthly-statement',
      color: 'bg-purple-500',
    },
    {
      title: 'Custom Report',
      description: 'Build a custom report with specific parameters',
      icon: Settings,
      href: '/reports/custom',
      color: 'bg-amber-500',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate and download professional reports for your investments
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {reportTypes.map((report) => (
          <Link key={report.href} to={report.href}>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className={`rounded-lg ${report.color} p-3 w-fit mb-4`}>
                  <report.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{report.title}</h3>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Reports */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Reports</CardTitle>
                  <CardDescription className="mt-2">
                    Your recently generated reports
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/reports/history">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recentReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No reports generated yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first report to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="rounded-lg bg-muted p-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">
                              {report.reportType.replace(/_/g, ' ').toUpperCase()}
                            </p>
                            {getStatusBadge(report.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {report.format.toUpperCase()} •{' '}
                            {format(new Date(report.createdAt), 'PPP')}
                          </p>
                        </div>
                      </div>
                      {report.status === 'completed' && (
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Total Generated</span>
                </div>
                <span className="font-semibold">{recentReports.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Downloads</span>
                </div>
                <span className="font-semibold">
                  {recentReports.reduce((sum, r) => sum + r.downloadCount, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Last Generated</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {recentReports.length > 0
                    ? format(new Date(recentReports[0].createdAt), 'PP')
                    : 'Never'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Report Tips
                  </p>
                  <ul className="text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>PDF reports are best for printing</li>
                    <li>Excel format allows data analysis</li>
                    <li>Schedule reports to receive them automatically</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
