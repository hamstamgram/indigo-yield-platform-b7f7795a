// @ts-nocheck
/**
 * Monthly Statement Page
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportBuilder } from '@/components/reports/ReportBuilder';

export default function MonthlyStatement() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Monthly Statement
          </h1>
          <p className="text-muted-foreground mt-2">
            View detailed monthly account statements
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What's Included</CardTitle>
          <CardDescription>
            Complete monthly overview of your account activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Beginning and ending balances</li>
            <li>All deposits and withdrawals</li>
            <li>Investment performance summary</li>
            <li>Transaction details</li>
            <li>Fees and charges</li>
            <li>Asset allocation</li>
          </ul>
        </CardContent>
      </Card>

      <ReportBuilder defaultReportType="monthly_statement" />
    </div>
  );
}
