/**
 * PDF Generation Demo Component
 * Demonstrates PDF generation capabilities with sample data
 */

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChartContainer } from '@/components/ui/chart';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';
import { StatementData } from '@/lib/pdf';
import { Download, FileText, Eye } from 'lucide-react';

// Sample data for demonstration
const sampleStatementData: StatementData = {
  investor: {
    id: 'inv_001',
    name: 'John Smith',
    email: 'john.smith@example.com',
    fund_code: 'INDIGO',
    fund_name: 'Indigo Digital Assets Fund',
    account_number: 'ACC-789123',
  },
  period: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
    quarter: 'Q1',
    year: 2024,
  },
  summary: {
    totalValue: 125000,
    beginningValue: 100000,
    endingValue: 125000,
    netDeposits: 10000,
    netWithdrawals: 0,
    totalReturn: 15000,
    totalReturnPercent: 15.0,
    managementFees: 250,
    performanceFees: 1500,
  },
  holdings: [
    {
      asset: 'Bitcoin',
      symbol: 'BTC',
      quantity: 2.5,
      price: 45000,
      value: 112500,
      percentOfPortfolio: 90.0,
    },
    {
      asset: 'Ethereum',
      symbol: 'ETH',
      quantity: 5.0,
      price: 2500,
      value: 12500,
      percentOfPortfolio: 10.0,
    },
  ],
  transactions: [
    {
      date: new Date('2024-01-05'),
      type: 'deposit',
      description: 'Initial deposit',
      amount: 10000,
      balance: 110000,
    },
    {
      date: new Date('2024-01-15'),
      type: 'yield',
      description: 'Monthly yield distribution',
      amount: 1200,
      balance: 111200,
    },
    {
      date: new Date('2024-01-31'),
      type: 'fee',
      description: 'Management fee',
      amount: -250,
      balance: 124750,
    },
  ],
  performance: {
    mtd: 15.0,
    qtd: 15.0,
    ytd: 15.0,
    itd: 25.0,
    benchmark: {
      name: 'Bitcoin',
      mtd: 12.0,
      qtd: 12.0,
      ytd: 12.0,
      itd: 18.0,
    },
  },
  charts: {
    allocationChart: '', // Will be generated from chart
    performanceChart: '', // Will be generated from chart
  },
};

const chartConfig = {
  bitcoin: {
    label: 'Bitcoin',
    color: '#f7931a',
  },
  ethereum: {
    label: 'Ethereum',
    color: '#627eea',
  },
  portfolio: {
    label: 'Portfolio',
    color: '#1e40af',
  },
  benchmark: {
    label: 'Bitcoin',
    color: '#f7931a',
  },
};

const performanceData = [
  { month: 'Dec', portfolio: 100, benchmark: 100 },
  { month: 'Jan', portfolio: 115, benchmark: 112 },
];

const allocationData = [
  { name: 'Bitcoin', value: 90, color: '#f7931a' },
  { name: 'Ethereum', value: 10, color: '#627eea' },
];

export function PDFGenerationDemo() {
  const allocationChartRef = useRef<HTMLDivElement>(null);
  const performanceChartRef = useRef<HTMLDivElement>(null);
  
  const { 
    generatePDF, 
    downloadPDF, 
    previewPDF, 
    exportChartAsImage, 
    isGenerating, 
    error, 
    clearError 
  } = usePDFGeneration({
    branding: {
      colors: {
        primary: '#1e40af',
        secondary: '#64748b',
        accent: '#f59e0b',
        text: '#1f2937',
        textSecondary: '#6b7280',
        background: '#ffffff',
      },
    },
    defaultOptions: {
      includeTransactions: true,
      includePerformanceComparison: true,
      includeBenchmark: true,
      includeDisclosures: true,
      pageSize: 'A4',
    },
  });

  const handleGeneratePDF = async (download: boolean = true) => {
    try {
      clearError();

      // First, export charts as images
      let allocationChart = '';
      let performanceChart = '';

      if (allocationChartRef.current) {
        allocationChart = await exportChartAsImage(allocationChartRef.current, {
          width: 400,
          height: 300,
          backgroundColor: '#ffffff',
        }) || '';
      }

      if (performanceChartRef.current) {
        performanceChart = await exportChartAsImage(performanceChartRef.current, {
          width: 600,
          height: 400,
          backgroundColor: '#ffffff',
        }) || '';
      }

      // Update statement data with chart images
      const statementDataWithCharts = {
        ...sampleStatementData,
        charts: {
          allocationChart,
          performanceChart,
        },
      };

      // Generate PDF
      const result = await generatePDF(statementDataWithCharts);

      if (result) {
        if (download) {
          downloadPDF(result);
        } else {
          previewPDF(result);
        }
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PDF Generation Demo</h1>
          <p className="text-gray-600 mt-2">
            Test the professional investor statement PDF generation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleGeneratePDF(false)}
            variant="outline"
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview PDF
          </Button>
          <Button
            onClick={() => handleGeneratePDF(true)}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            PDF generation failed: {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Allocation Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Portfolio Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={allocationChartRef}>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Performance Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={performanceChartRef}>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Line 
                      type="monotone" 
                      dataKey="portfolio" 
                      stroke="#1e40af" 
                      strokeWidth={3}
                      name="Portfolio"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="benchmark" 
                      stroke="#f7931a" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Bitcoin"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample Data Display */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Statement Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Investor</h4>
              <p className="text-lg font-bold">{sampleStatementData.investor.name}</p>
              <p className="text-sm text-gray-500">{sampleStatementData.investor.fund_name}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Total Value</h4>
              <p className="text-lg font-bold text-green-600">
                ${sampleStatementData.summary.totalValue.toLocaleString()}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Total Return</h4>
              <p className="text-lg font-bold text-green-600">
                {sampleStatementData.summary.totalReturnPercent}%
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Holdings</h4>
              <p className="text-lg font-bold">{sampleStatementData.holdings.length} assets</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
