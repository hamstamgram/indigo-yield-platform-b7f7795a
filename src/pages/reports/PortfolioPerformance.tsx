/**
 * Portfolio Performance Report Page
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportBuilder } from '@/components/reports/ReportBuilder';

export default function PortfolioPerformance() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Portfolio Performance Report
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate a comprehensive performance analysis report
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What's Included</CardTitle>
          <CardDescription>
            This report includes detailed analysis of your portfolio performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Portfolio value and return metrics</li>
            <li>Asset allocation breakdown</li>
            <li>Performance by asset class</li>
            <li>Benchmark comparisons</li>
            <li>Risk metrics and volatility analysis</li>
            <li>Transaction history summary</li>
          </ul>
        </CardContent>
      </Card>

      <ReportBuilder defaultReportType="portfolio_performance" />
    </div>
  );
}
