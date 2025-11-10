import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Database,
  Loader2,
  RefreshCw,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { dataIntegrityService } from '@/services/dataIntegrityService';

interface IntegrityIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  details?: any;
  recordId?: string;
  table?: string;
}

const DataIntegrityDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [summary, setSummary] = useState({
    critical: 0,
    warnings: 0,
    info: 0,
    total: 0
  });

  useEffect(() => {
    runIntegrityCheck();
  }, []);

  const runIntegrityCheck = async () => {
    try {
      setLoading(true);
      toast.info('Running data integrity checks...');

      const results = await dataIntegrityService.runFullIntegrityCheck();
      const allIssues: IntegrityIssue[] = [];

      // Process orphaned records
      if (results.orphanedRecords.positions.length > 0) {
        allIssues.push({
          severity: 'critical',
          category: 'Orphaned Records',
          message: `${results.orphanedRecords.positions.length} position(s) with invalid investor references`,
          details: results.orphanedRecords.positions,
          table: 'positions'
        });
      }

      if (results.orphanedRecords.transactions.length > 0) {
        allIssues.push({
          severity: 'critical',
          category: 'Orphaned Records',
          message: `${results.orphanedRecords.transactions.length} transaction(s) with invalid investor references`,
          details: results.orphanedRecords.transactions,
          table: 'transactions_v2'
        });
      }

      if (results.orphanedRecords.investorPositions.length > 0) {
        allIssues.push({
          severity: 'critical',
          category: 'Orphaned Records',
          message: `${results.orphanedRecords.investorPositions.length} investor position(s) with invalid references`,
          details: results.orphanedRecords.investorPositions,
          table: 'investor_positions'
        });
      }

      // Process negative balances
      if (results.negativeBalances.positions.length > 0) {
        allIssues.push({
          severity: 'critical',
          category: 'Negative Balances',
          message: `${results.negativeBalances.positions.length} position(s) with negative balances`,
          details: results.negativeBalances.positions,
          table: 'positions'
        });
      }

      if (results.negativeBalances.investorPositions.length > 0) {
        allIssues.push({
          severity: 'warning',
          category: 'Negative Balances',
          message: `${results.negativeBalances.investorPositions.length} investor position(s) with negative values`,
          details: results.negativeBalances.investorPositions,
          table: 'investor_positions'
        });
      }

      // Process missing required fields
      Object.entries(results.missingRequiredFields).forEach(([table, records]) => {
        const recordArray = records as any[];
        if (recordArray.length > 0) {
          allIssues.push({
            severity: 'warning',
            category: 'Missing Required Fields',
            message: `${recordArray.length} record(s) in ${table} with missing required fields`,
            details: recordArray,
            table
          });
        }
      });

      // Process data validation issues
      if (results.dataValidation.invalidEmails.length > 0) {
        allIssues.push({
          severity: 'warning',
          category: 'Data Validation',
          message: `${results.dataValidation.invalidEmails.length} investor(s) with invalid email formats`,
          details: results.dataValidation.invalidEmails,
          table: 'investors'
        });
      }

      if (results.dataValidation.futureTransactions.length > 0) {
        allIssues.push({
          severity: 'warning',
          category: 'Data Validation',
          message: `${results.dataValidation.futureTransactions.length} transaction(s) with future dates`,
          details: results.dataValidation.futureTransactions,
          table: 'transactions_v2'
        });
      }

      if (results.dataValidation.zeroAmountTransactions.length > 0) {
        allIssues.push({
          severity: 'info',
          category: 'Data Validation',
          message: `${results.dataValidation.zeroAmountTransactions.length} transaction(s) with zero amount`,
          details: results.dataValidation.zeroAmountTransactions,
          table: 'transactions_v2'
        });
      }

      // Process inconsistent totals
      if (results.inconsistentTotals.length > 0) {
        allIssues.push({
          severity: 'critical',
          category: 'Inconsistent Totals',
          message: `${results.inconsistentTotals.length} investor(s) with transaction totals not matching position values`,
          details: results.inconsistentTotals,
          table: 'multiple'
        });
      }

      setIssues(allIssues);

      // Calculate summary
      const newSummary = {
        critical: allIssues.filter(i => i.severity === 'critical').length,
        warnings: allIssues.filter(i => i.severity === 'warning').length,
        info: allIssues.filter(i => i.severity === 'info').length,
        total: allIssues.length
      };
      setSummary(newSummary);

      setLastCheck(new Date());

      if (allIssues.length === 0) {
        toast.success('No data integrity issues found!');
      } else {
        toast.warning(`Found ${allIssues.length} data integrity issue(s)`);
      }
    } catch (error) {
      console.error('Error running integrity check:', error);
      toast.error('Failed to run integrity check');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Warning</Badge>;
      case 'info':
        return <Badge variant="outline">Info</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const groupedIssues = {
    critical: issues.filter(i => i.severity === 'critical'),
    warning: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info')
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Data Integrity Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive database integrity checks and validation
          </p>
          {lastCheck && (
            <p className="text-sm text-muted-foreground mt-1">
              Last check: {lastCheck.toLocaleString()}
            </p>
          )}
        </div>
        <Button onClick={runIntegrityCheck} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Run Check
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Found in database</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.critical}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.warnings}</div>
            <p className="text-xs text-muted-foreground">Should be reviewed</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.info}</div>
            <p className="text-xs text-muted-foreground">Minor issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {!loading && issues.length === 0 && lastCheck && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            All Clear!
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            No data integrity issues found. Your database is in good shape.
          </AlertDescription>
        </Alert>
      )}

      {/* Issues by Severity */}
      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Issues Found</CardTitle>
            <CardDescription>
              Review and resolve data integrity issues organized by severity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {/* Critical Issues */}
              {groupedIssues.critical.length > 0 && (
                <AccordionItem value="critical">
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <XCircle className="h-5 w-5 text-destructive" />
                      <span className="font-semibold">
                        Critical Issues ({groupedIssues.critical.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {groupedIssues.critical.map((issue, idx) => (
                        <Alert key={idx} variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="flex items-center gap-2">
                            {issue.category}
                            {getSeverityBadge(issue.severity)}
                          </AlertTitle>
                          <AlertDescription>
                            <p className="mb-2">{issue.message}</p>
                            {issue.table && (
                              <p className="text-xs font-mono">Table: {issue.table}</p>
                            )}
                            {issue.details && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm font-semibold">
                                  View Details ({Array.isArray(issue.details) ? issue.details.length : 1} records)
                                </summary>
                                <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                                  {JSON.stringify(issue.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Warning Issues */}
              {groupedIssues.warning.length > 0 && (
                <AccordionItem value="warning">
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">
                        Warnings ({groupedIssues.warning.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {groupedIssues.warning.map((issue, idx) => (
                        <Alert key={idx} className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertTitle className="flex items-center gap-2">
                            {issue.category}
                            {getSeverityBadge(issue.severity)}
                          </AlertTitle>
                          <AlertDescription>
                            <p className="mb-2">{issue.message}</p>
                            {issue.table && (
                              <p className="text-xs font-mono">Table: {issue.table}</p>
                            )}
                            {issue.details && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm font-semibold">
                                  View Details ({Array.isArray(issue.details) ? issue.details.length : 1} records)
                                </summary>
                                <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                                  {JSON.stringify(issue.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Info Issues */}
              {groupedIssues.info.length > 0 && (
                <AccordionItem value="info">
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <Info className="h-5 w-5 text-blue-500" />
                      <span className="font-semibold">
                        Informational ({groupedIssues.info.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {groupedIssues.info.map((issue, idx) => (
                        <Alert key={idx} className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="flex items-center gap-2">
                            {issue.category}
                            {getSeverityBadge(issue.severity)}
                          </AlertTitle>
                          <AlertDescription>
                            <p className="mb-2">{issue.message}</p>
                            {issue.table && (
                              <p className="text-xs font-mono">Table: {issue.table}</p>
                            )}
                            {issue.details && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm font-semibold">
                                  View Details ({Array.isArray(issue.details) ? issue.details.length : 1} records)
                                </summary>
                                <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                                  {JSON.stringify(issue.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Running data integrity checks...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a few moments</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataIntegrityDashboard;
