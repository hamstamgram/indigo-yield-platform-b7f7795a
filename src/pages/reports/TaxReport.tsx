/**
 * Tax Report Page (1099)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportBuilder } from '@/components/reports/ReportBuilder';

export default function TaxReport() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Tax Report (1099)
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate your annual tax documents
          </p>
        </div>
      </div>

      <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <p className="font-medium mb-2">Important Tax Information</p>
            <p className="text-amber-800 dark:text-amber-200">
              This report includes all taxable events for the selected year. Please consult with a
              tax professional for filing guidance. Forms are typically available by January 31st.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What's Included</CardTitle>
          <CardDescription>
            Complete tax information for your investment activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Capital gains and losses (short-term and long-term)</li>
            <li>Dividend income and distributions</li>
            <li>Interest income</li>
            <li>Cost basis information</li>
            <li>Detailed transaction records</li>
            <li>Form 1099-DIV and 1099-INT data</li>
          </ul>
        </CardContent>
      </Card>

      <ReportBuilder defaultReportType="tax_report" />
    </div>
  );
}
