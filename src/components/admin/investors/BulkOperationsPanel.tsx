import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  exportInvestorPositions,
  importPositionsFromCSV,
  generateSampleCSV,
  type ImportResult,
} from "@/services/bulkOperationsService";

const BulkOperationsPanel = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportInvestorPositions();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `investor-positions-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Investor positions exported successfully",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export investor positions",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportResult(null);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const result = await importPositionsFromCSV(file, overwriteExisting);

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);

      if (result.success) {
        toast({
          title: "Import Complete",
          description: `Successfully processed ${result.processed} positions`,
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `${result.processed} successful, ${result.failed} failed`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import positions",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setTimeout(() => {
        setImportProgress(0);
        setImportResult(null);
      }, 5000);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  const downloadSample = () => {
    const blob = generateSampleCSV();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-positions-import.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Export current investor positions to CSV for analysis or backup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
            {isExporting ? "Exporting..." : "Export Positions CSV"}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </CardTitle>
          <CardDescription>Import investor positions from CSV file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="overwrite"
              checked={overwriteExisting}
              onCheckedChange={setOverwriteExisting}
            />
            <Label htmlFor="overwrite">Overwrite existing positions</Label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={isImporting}
              className="flex-1"
            />
            <Button variant="outline" onClick={downloadSample} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Sample CSV
            </Button>
          </div>

          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">Processing... {importProgress}%</p>
            </div>
          )}

          {importResult && (
            <Alert variant={importResult.success ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>Processed:</strong> {importResult.processed} |<strong> Failed:</strong>{" "}
                    {importResult.failed}
                  </p>
                  {importResult.errors.length > 0 && (
                    <details className="text-sm">
                      <summary>Errors ({importResult.errors.length})</summary>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {importResult.errors.slice(0, 10).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li>... and {importResult.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Bulk Adjustments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Balance Adjustments</CardTitle>
          <CardDescription>Apply balance adjustments to multiple investors at once</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bulk adjustments should be used with caution. All changes are logged for audit
              purposes. Use the CSV import feature above for complex bulk operations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkOperationsPanel;
