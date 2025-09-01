import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { computeStatement } from '@/utils/statementCalculations';
import { generateStatementPDF } from '@/utils/statementPdfGenerator';
import { uploadStatementToStorage } from '@/utils/statementStorage';
import { 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Send,
  Users,
  User
} from 'lucide-react';

interface AdminStatementGeneratorProps {
  investors: any[];
  onSuccess?: () => void;
}

interface GenerationResult {
  investor_id: string;
  investor_name: string;
  success: boolean;
  storage_path?: string;
  signed_url?: string;
  error?: string;
}

const AdminStatementGenerator: React.FC<AdminStatementGeneratorProps> = ({ 
  investors, 
  onSuccess 
}) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [selectedInvestor, setSelectedInvestor] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [sendEmail, setSendEmail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const { toast } = useToast();

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= currentYear - 5; year--) {
    years.push(year);
  }

  const generateSingleStatement = async () => {
    if (!selectedInvestor) {
      toast({
        title: 'Validation Error',
        description: 'Please select an investor',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    setProgress(0);
    setResults([]);

    try {
      const result = await generateStatementForInvestor(
        selectedInvestor,
        selectedYear,
        selectedMonth
      );

      setResults([result]);
      
      if (result.success) {
        toast({
          title: 'Statement Generated',
          description: `Successfully generated statement for ${result.investor_name}`,
        });

        if (sendEmail) {
          // TODO: Send email notification
          console.log('Email notification would be sent here');
        }
      } else {
        toast({
          title: 'Generation Failed',
          description: result.error || 'Failed to generate statement',
          variant: 'destructive',
        });
      }

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate statement',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  const generateBulkStatements = async () => {
    setGenerating(true);
    setProgress(0);
    setResults([]);

    const bulkResults: GenerationResult[] = [];
    const totalInvestors = investors.length;

    for (let i = 0; i < investors.length; i++) {
      const investor = investors[i];
      setProgress(Math.round(((i + 1) / totalInvestors) * 100));

      const result = await generateStatementForInvestor(
        investor.id,
        selectedYear,
        selectedMonth
      );

      bulkResults.push(result);
    }

    setResults(bulkResults);
    
    const successCount = bulkResults.filter(r => r.success).length;
    const failCount = bulkResults.filter(r => !r.success).length;

    toast({
      title: 'Bulk Generation Complete',
      description: `Generated ${successCount} statements successfully. ${failCount} failed.`,
    });

    if (onSuccess) onSuccess();
    setGenerating(false);
    setProgress(0);
  };

  const generateStatementForInvestor = async (
    investor_id: string,
    year: number,
    month: number
  ): Promise<GenerationResult> => {
    try {
      // Get current user (admin)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Compute statement data
      const statementData = await computeStatement(investor_id, year, month);
      
      if (!statementData) {
        return {
          investor_id,
          investor_name: 'Unknown',
          success: false,
          error: 'Failed to compute statement data'
        };
      }

      // Generate PDF
      const pdfBlob = await generateStatementPDF(statementData);

      // Upload to storage
      const storageResult = await uploadStatementToStorage(
        pdfBlob,
        investor_id,
        year,
        month
      );

      if (!storageResult) {
        return {
          investor_id,
          investor_name: statementData.investor_name,
          success: false,
          error: 'Failed to upload PDF to storage'
        };
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('statements')
        .upsert({
          investor_id,
          period_year: year,
          period_month: month,
          asset_code: 'ALL', // Combined statement
          begin_balance: statementData.summary.begin_balance,
          additions: statementData.summary.additions,
          redemptions: statementData.summary.redemptions,
          net_income: statementData.summary.net_income,
          end_balance: statementData.summary.end_balance,
          rate_of_return_mtd: statementData.summary.rate_of_return_mtd,
          rate_of_return_qtd: statementData.summary.rate_of_return_qtd,
          rate_of_return_ytd: statementData.summary.rate_of_return_ytd,
          rate_of_return_itd: statementData.summary.rate_of_return_itd,
          storage_path: storageResult.storage_path
        }, {
          onConflict: 'investor_id,period_year,period_month,asset_code'
        });

      if (dbError) {
        console.error('Database error:', dbError);
        return {
          investor_id,
          investor_name: statementData.investor_name,
          success: false,
          error: 'Failed to save statement to database'
        };
      }

      // Log to audit trail
      const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
          actor_user: user.id,
          action: 'STATEMENT_GENERATE',
          entity: 'statements',
          entity_id: `${investor_id}_${year}_${month}`,
          new_values: {
            investor_id,
            period_year: year,
            period_month: month,
            storage_path: storageResult.storage_path
          },
          meta: {
            investor_name: statementData.investor_name,
            summary: statementData.summary
          }
        });

      if (auditError) console.error('Audit log error:', auditError);

      return {
        investor_id,
        investor_name: statementData.investor_name,
        success: true,
        storage_path: storageResult.storage_path,
        signed_url: storageResult.signed_url
      };
    } catch (error: any) {
      console.error('Statement generation error:', error);
      return {
        investor_id,
        investor_name: 'Unknown',
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'single' ? 'default' : 'outline'}
          onClick={() => setMode('single')}
          disabled={generating}
        >
          <User className="mr-2 h-4 w-4" />
          Single Investor
        </Button>
        <Button
          variant={mode === 'bulk' ? 'default' : 'outline'}
          onClick={() => setMode('bulk')}
          disabled={generating}
        >
          <Users className="mr-2 h-4 w-4" />
          Bulk Generation
        </Button>
      </div>

      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === 'single' ? 'Generate Single Statement' : 'Bulk Statement Generation'}
          </CardTitle>
          <CardDescription>
            Generate monthly statements for {mode === 'single' ? 'an investor' : 'all investors'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'single' && (
            <div className="space-y-2">
              <Label>Select Investor</Label>
              <Select
                value={selectedInvestor}
                onValueChange={setSelectedInvestor}
                disabled={generating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an investor" />
                </SelectTrigger>
                <SelectContent>
                  {investors.map((investor) => (
                    <SelectItem key={investor.id} value={investor.id}>
                      {investor.first_name} {investor.last_name} ({investor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
                disabled={generating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
                disabled={generating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              disabled={generating}
            />
            <Label htmlFor="send-email" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send email notification to investor(s)
            </Label>
          </div>

          {generating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Generating statements...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <Button
            onClick={mode === 'single' ? generateSingleStatement : generateBulkStatements}
            disabled={generating || (mode === 'single' && !selectedInvestor)}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Statement{mode === 'bulk' ? 's' : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">{result.investor_name}</span>
                  </div>
                  {result.success && result.signed_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(result.signed_url, '_blank')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  )}
                  {!result.success && (
                    <span className="text-sm text-red-600">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminStatementGenerator;
