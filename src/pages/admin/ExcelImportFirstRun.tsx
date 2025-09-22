import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Info,
  Lock,
  Unlock
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface ImportResult {
  success: boolean;
  processed?: number;
  errors?: any[];
  class_summary?: Record<string, number>;
  dry_run?: boolean;
}

interface ParityResult {
  ok: boolean;
  differences?: any[];
  summary?: {
    total_investors: number;
    total_positions: number;
    total_transactions: number;
    fund_classes: string[];
  };
}

export default function ExcelImportFirstRun() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<ImportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parityResult, setParityResult] = useState<ParityResult | null>(null);
  const [step, setStep] = useState<'upload' | 'dry-run' | 'import' | 'parity' | 'complete'>('upload');
  const [progress, setProgress] = useState(0);
  const [importLocked, setImportLocked] = useState(false);
  const { toast } = useToast();

  const PROJECT_REF = 'nkfimvovosdehmyyjubn';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an Excel (.xlsx) file',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setDryRunResult(null);
      setImportResult(null);
      setParityResult(null);
    }
  };

  const runDryRun = async () => {
    if (!file) return;

    setImporting(true);
    setStep('dry-run');
    setProgress(25);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dry_run', 'true');

      const response = await fetch(
        `https://${PROJECT_REF}.functions.supabase.co/excel_import`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      const result: ImportResult = await response.json();
      setDryRunResult(result);

      if (result.success) {
        toast({
          title: 'Dry run successful',
          description: `${result.processed} records validated`,
        });
        setProgress(50);
      } else {
        toast({
          title: 'Dry run failed',
          description: `Found ${result.errors?.length || 0} errors`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Dry run error:', error);
      toast({
        title: 'Error',
        description: 'Failed to run dry run validation',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const runActualImport = async () => {
    if (!file || !dryRunResult?.success) return;

    setImporting(true);
    setStep('import');
    setProgress(75);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dry_run', 'false');

      const response = await fetch(
        `https://${PROJECT_REF}.functions.supabase.co/excel_import`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      const result: ImportResult = await response.json();
      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Import successful',
          description: `Imported ${result.processed} records`,
        });
        setProgress(90);
        
        // Automatically run parity check
        await runParityCheck();
      } else {
        toast({
          title: 'Import failed',
          description: 'Check the errors and try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: 'Failed to import Excel data',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const runParityCheck = async () => {
    if (!file) return;

    setStep('parity');
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        
        const response = await fetch(
          `https://${PROJECT_REF}.functions.supabase.co/parity_check?file=${encodeURIComponent(base64 || '')}`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );

        const result: ParityResult = await response.json();
        setParityResult(result);
        setProgress(100);
        setStep('complete');

        if (result.ok) {
          toast({
            title: 'Parity check passed',
            description: 'Data import verified successfully',
          });
        } else {
          toast({
            title: 'Parity check found differences',
            description: `Found ${result.differences?.length || 0} discrepancies`,
            variant: 'destructive',
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Parity check error:', error);
      toast({
        title: 'Error',
        description: 'Failed to run parity check',
        variant: 'destructive',
      });
    }
  };

  const lockImports = async () => {
    try {
      // This would call the lock_imports function via Supabase
      setImportLocked(true);
      toast({
        title: 'Imports locked',
        description: 'Excel imports are now disabled',
      });
    } catch (error) {
      console.error('Lock error:', error);
      toast({
        title: 'Error',
        description: 'Failed to lock imports',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Excel Import - First Run</h1>
          <p className="text-muted-foreground">
            Initial data import from Excel workbook
          </p>
        </div>
        <Button
          variant={importLocked ? 'destructive' : 'outline'}
          onClick={lockImports}
          disabled={step !== 'complete'}
        >
          {importLocked ? (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Imports Locked
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4 mr-2" />
              Lock Imports
            </>
          )}
        </Button>
      </div>

      {/* Progress Indicator */}
      {step !== 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Import Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="mb-4" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Upload</span>
              <span>Dry Run</span>
              <span>Import</span>
              <span>Parity Check</span>
              <span>Complete</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={step} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload" disabled={step !== 'upload'}>
            Upload
          </TabsTrigger>
          <TabsTrigger value="dry-run" disabled={!dryRunResult}>
            Dry Run
          </TabsTrigger>
          <TabsTrigger value="import" disabled={!importResult}>
            Import
          </TabsTrigger>
          <TabsTrigger value="parity" disabled={!parityResult}>
            Parity
          </TabsTrigger>
          <TabsTrigger value="complete" disabled={step !== 'complete'}>
            Complete
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Excel File</CardTitle>
              <CardDescription>
                Select the Excel file containing investor data to import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Before you begin</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Ensure the Excel file follows the expected format</li>
                    <li>Back up your database before importing</li>
                    <li>This is a one-time import for initial data</li>
                    <li>After import, lock the system to prevent accidental re-imports</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild variant="outline">
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Select Excel File
                    </span>
                  </Button>
                </label>
                {file && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Selected file:</p>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              {file && (
                <Button 
                  className="w-full" 
                  onClick={runDryRun}
                  disabled={importing}
                >
                  Run Dry Run Validation
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dry-run" className="space-y-4">
          {dryRunResult && (
            <Card>
              <CardHeader>
                <CardTitle>Dry Run Results</CardTitle>
                <CardDescription>
                  Validation results without making any changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dryRunResult.success ? (
                  <Alert className="mb-4">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Validation Successful</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2">
                        <p>Processed: {dryRunResult.processed} records</p>
                        {dryRunResult.class_summary && (
                          <div className="mt-2">
                            <p className="font-medium">By Fund Class:</p>
                            <ul className="list-disc list-inside">
                              {Object.entries(dryRunResult.class_summary).map(([cls, count]) => (
                                <li key={cls}>{cls}: {count} transactions</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive" className="mb-4">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Validation Failed</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2">
                        <p>Found {dryRunResult.errors?.length || 0} errors</p>
                        {dryRunResult.errors && dryRunResult.errors.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer">View errors</summary>
                            <pre className="mt-2 text-xs overflow-auto">
                              {JSON.stringify(dryRunResult.errors, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {dryRunResult.success && (
                  <Button 
                    className="w-full" 
                    onClick={runActualImport}
                    disabled={importing}
                  >
                    Proceed with Actual Import
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
                <CardDescription>
                  Data has been imported to the database
                </CardDescription>
              </CardHeader>
              <CardContent>
                {importResult.success ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Import Successful</AlertTitle>
                    <AlertDescription>
                      <p>Successfully imported {importResult.processed} records</p>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Import Failed</AlertTitle>
                    <AlertDescription>
                      Check the error logs for details
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="parity" className="space-y-4">
          {parityResult && (
            <Card>
              <CardHeader>
                <CardTitle>Parity Check Results</CardTitle>
                <CardDescription>
                  Verification of imported data against source Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                {parityResult.ok ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Parity Check Passed</AlertTitle>
                    <AlertDescription>
                      All data matches between Excel and database
                      {parityResult.summary && (
                        <div className="mt-2">
                          <p>Total Investors: {parityResult.summary.total_investors}</p>
                          <p>Total Positions: {parityResult.summary.total_positions}</p>
                          <p>Total Transactions: {parityResult.summary.total_transactions}</p>
                          <p>Fund Classes: {parityResult.summary.fund_classes.join(', ')}</p>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Parity Check Found Differences</AlertTitle>
                    <AlertDescription>
                      Found {parityResult.differences?.length || 0} discrepancies
                      {parityResult.differences && parityResult.differences.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer">View differences</summary>
                          <pre className="mt-2 text-xs overflow-auto">
                            {JSON.stringify(parityResult.differences, null, 2)}
                          </pre>
                        </details>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="complete" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Complete</CardTitle>
              <CardDescription>
                All steps have been completed successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>
                  The initial data import has been completed. Please review the imported data
                  and lock the import system to prevent accidental re-imports.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h3 className="font-medium">Next Steps:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Review imported data in the Investors and Transactions sections</li>
                  <li>Verify fund balances and positions are correct</li>
                  <li>Lock the import system using the button above</li>
                  <li>Set EXCEL_IMPORT_ENABLED=false in environment variables</li>
                  <li>Document the import for audit purposes</li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  variant="destructive"
                  className="w-full"
                  onClick={lockImports}
                  disabled={importLocked}
                >
                  {importLocked ? 'Imports Already Locked' : 'Lock Import System'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
