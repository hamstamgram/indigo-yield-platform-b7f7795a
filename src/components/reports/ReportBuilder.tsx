/**
 * Report Builder Component
 * Allows users to configure and generate reports
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ReportsApi } from '@/services/api/reportsApi';
import {
  ReportType,
  ReportFormat,
  ReportDefinition,
  GenerateReportRequest,
  ReportFilters,
  ReportParameters,
} from '@/types/reports';

interface ReportBuilderProps {
  defaultReportType?: ReportType;
  onReportGenerated?: (reportId: string) => void;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  defaultReportType,
  onReportGenerated,
}) => {
  const { toast } = useToast();

  // State
  const [reportDefinitions, setReportDefinitions] = useState<ReportDefinition[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | ''>(
    defaultReportType || ''
  );
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('pdf');
  const [selectedDefinition, setSelectedDefinition] = useState<ReportDefinition | null>(null);

  // Filters
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [period, setPeriod] = useState<'mtd' | 'qtd' | 'ytd' | 'custom'>('mtd');

  // Parameters
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includeDisclosures, setIncludeDisclosures] = useState(true);
  const [confidential, setConfidential] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // Load report definitions
  useEffect(() => {
    loadReportDefinitions();
  }, []);

  // Update selected definition when report type changes
  useEffect(() => {
    if (selectedReportType && reportDefinitions.length > 0) {
      const def = reportDefinitions.find((d) => d.reportType === selectedReportType);
      setSelectedDefinition(def || null);

      // Set default format based on available formats
      if (def && def.availableFormats.length > 0) {
        setSelectedFormat(def.availableFormats[0]);
      }
    }
  }, [selectedReportType, reportDefinitions]);

  // Update date range based on period
  useEffect(() => {
    const now = new Date();
    let start: Date;

    switch (period) {
      case 'mtd':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'qtd':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'ytd':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return; // Custom, don't auto-set
    }

    setDateRangeStart(format(start, 'yyyy-MM-dd'));
    setDateRangeEnd(format(now, 'yyyy-MM-dd'));
  }, [period]);

  const loadReportDefinitions = async () => {
    const definitions = await ReportsApi.getReportDefinitions(true);
    setReportDefinitions(definitions);
  };

  const handleGenerateReport = async (downloadNow: boolean = false) => {
    if (!selectedReportType) {
      toast({
        title: 'Error',
        description: 'Please select a report type',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('Preparing report...');

    try {
      const filters: ReportFilters = {};
      const parameters: ReportParameters = {
        includeCharts,
        includeTransactions,
        includeDisclosures,
        confidential,
      };

      // Add date range if specified
      if (dateRangeStart) filters.dateRangeStart = dateRangeStart;
      if (dateRangeEnd) filters.dateRangeEnd = dateRangeEnd;
      if (period !== 'custom') filters.period = period;

      const request: GenerateReportRequest = {
        reportType: selectedReportType,
        format: selectedFormat,
        filters,
        parameters,
        reportDefinitionId: selectedDefinition?.id,
      };

      if (downloadNow) {
        // Generate and download immediately
        setGenerationProgress('Generating report...');
        const result = await ReportsApi.generateReportNow(request);

        if (result.success && result.data && result.filename) {
          setGenerationProgress('Downloading...');

          // Create download link
          const blob = new Blob([result.data], {
            type:
              selectedFormat === 'pdf'
                ? 'application/pdf'
                : selectedFormat === 'excel'
                  ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  : selectedFormat === 'json'
                    ? 'application/json'
                    : 'text/csv',
          });

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = result.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          toast({
            title: 'Success',
            description: 'Report downloaded successfully',
          });
        } else {
          throw new Error(result.error || 'Report generation failed');
        }
      } else {
        // Queue report generation
        setGenerationProgress('Queueing report...');
        const response = await ReportsApi.generateReport(request);

        if (response.success && response.reportId) {
          toast({
            title: 'Success',
            description: 'Report queued for generation. You will be notified when ready.',
          });

          if (onReportGenerated) {
            onReportGenerated(response.reportId);
          }
        } else {
          throw new Error(response.error || 'Report generation failed');
        }
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const getReportDescription = (): string => {
    if (!selectedDefinition) return '';
    return selectedDefinition.description || '';
  };

  const isDateRangeRequired = (): boolean => {
    return ['transaction_history', 'custom_date_range', 'tax_report'].includes(
      selectedReportType
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Report
          </CardTitle>
          <CardDescription>
            Configure and generate professional reports for your portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select
              value={selectedReportType}
              onValueChange={(value) => setSelectedReportType(value as ReportType)}
            >
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Select a report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" disabled>
                  Select a report type
                </SelectItem>
                {reportDefinitions.map((def) => (
                  <SelectItem key={def.id} value={def.reportType}>
                    {def.name}
                    {def.isAdminOnly && ' (Admin Only)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDefinition && (
              <p className="text-sm text-muted-foreground">{getReportDescription()}</p>
            )}
          </div>

          {/* Format Selection */}
          {selectedDefinition && (
            <div className="space-y-2">
              <Label htmlFor="format">Report Format</Label>
              <Select
                value={selectedFormat}
                onValueChange={(value) => setSelectedFormat(value as ReportFormat)}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedDefinition.availableFormats.map((fmt) => (
                    <SelectItem key={fmt} value={fmt}>
                      {fmt.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range */}
          {selectedReportType && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label>Date Range</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Select
                    value={period}
                    onValueChange={(value: any) => setPeriod(value)}
                  >
                    <SelectTrigger id="period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mtd">Month-to-Date</SelectItem>
                      <SelectItem value="qtd">Quarter-to-Date</SelectItem>
                      <SelectItem value="ytd">Year-to-Date</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {period === 'custom' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <input
                        type="date"
                        id="start-date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required={isDateRangeRequired()}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <input
                        type="date"
                        id="end-date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required={isDateRangeRequired()}
                      />
                    </div>
                  </>
                )}
              </div>

              {period !== 'custom' && (
                <div className="text-sm text-muted-foreground">
                  {dateRangeStart && dateRangeEnd && (
                    <span>
                      {format(new Date(dateRangeStart), 'MMM dd, yyyy')} -{' '}
                      {format(new Date(dateRangeEnd), 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Report Options */}
          {selectedReportType && selectedFormat === 'pdf' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <Label>Report Options</Label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-charts"
                    checked={includeCharts}
                    onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                  />
                  <Label htmlFor="include-charts" className="font-normal cursor-pointer">
                    Include charts and visualizations
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-transactions"
                    checked={includeTransactions}
                    onCheckedChange={(checked) => setIncludeTransactions(checked as boolean)}
                  />
                  <Label htmlFor="include-transactions" className="font-normal cursor-pointer">
                    Include transaction history
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-disclosures"
                    checked={includeDisclosures}
                    onCheckedChange={(checked) => setIncludeDisclosures(checked as boolean)}
                  />
                  <Label htmlFor="include-disclosures" className="font-normal cursor-pointer">
                    Include legal disclosures
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confidential"
                    checked={confidential}
                    onCheckedChange={(checked) => setConfidential(checked as boolean)}
                  />
                  <Label htmlFor="confidential" className="font-normal cursor-pointer">
                    Mark as confidential
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Generating Report</p>
                  <p className="text-sm text-muted-foreground">{generationProgress}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => handleGenerateReport(true)}
              disabled={!selectedReportType || isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Now
                </>
              )}
            </Button>

            <Button
              onClick={() => handleGenerateReport(false)}
              disabled={!selectedReportType || isGenerating}
              variant="outline"
            >
              Queue for Later
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Report Generation Tips
                </p>
                <ul className="text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>PDF reports are best for professional presentations</li>
                  <li>Excel reports allow for custom analysis and filtering</li>
                  <li>Large date ranges may take longer to process</li>
                  <li>Queued reports will be emailed when ready</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
