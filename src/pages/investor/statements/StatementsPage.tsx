import { useState } from "react";
import { sanitizeHtml } from "@/utils/sanitize";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Calendar, TrendingUp, Info, AlertCircle, Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getAssetConfig, getAssetName } from "@/utils/assets";
import { useToast } from "@/hooks";
import {
  useMonthlyStatements,
  useStatementYears,
  useStatementAssets,
  useDownloadStatement,
  type MonthlyStatement,
} from "@/hooks/data/useInvestorPortal";

const StatementsPage = () => {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    data: statements,
    isLoading,
    error,
  } = useMonthlyStatements(parseInt(selectedYear), selectedAsset);

  const { data: availableYears } = useStatementYears();
  const { data: availableAssets } = useStatementAssets();
  const downloadMutation = useDownloadStatement();

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleString("default", { month: "long" });
  };

  const formatAssetAmount = (value: number, assetCode: string): string => {
    const config = getAssetConfig(assetCode);
    const decimals = config?.decimals || 4;
    const symbol = config?.symbol || assetCode;

    return `${value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })} ${symbol}`;
  };

  const handleDownload = async (statement: MonthlyStatement) => {
    try {
      setDownloadingId(statement.id);

      const htmlContent = await downloadMutation.mutateAsync({
        periodYear: statement.period_year,
        periodMonth: statement.period_month,
      });

      // Add print-optimized CSS to the HTML
      const printStyles = `
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @page { size: A4; margin: 10mm; }
          }
        </style>
      `;
      
      const htmlWithPrintStyles = htmlContent.replace(
        '</head>',
        `${printStyles}</head>`
      );

      // Open in new window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error("Pop-up blocked. Please allow pop-ups for this site.");
      }

      printWindow.document.write(sanitizeHtml(htmlWithPrintStyles));
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

      toast({
        title: "Print Dialog Opened",
        description: "Use 'Save as PDF' in the print dialog to download your statement.",
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to open statement",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Monthly Statements" 
        subtitle="Access your monthly investment statements"
        icon={FileText}
      />

      <Card>
        <CardHeader>
          <CardTitle>Filter Statements</CardTitle>
          <CardDescription>Select year and asset to view specific statements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears?.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Asset</label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {availableAssets?.map((asset) => (
                    <SelectItem key={asset} value={asset}>
                      {getAssetName(asset)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading statements: {(error as Error).message}</AlertDescription>
        </Alert>
      ) : statements && statements.length > 0 ? (
        <div className="space-y-4">
          {statements.map((statement) => (
            <Card key={statement.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-display font-semibold">
                          {getMonthName(statement.period_month)} {statement.period_year}
                        </h3>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {statement.asset_code}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(statement)}
                        disabled={downloadingId === statement.id}
                      >
                        {downloadingId === statement.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download PDF
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Beginning Balance</p>
                        <p className="text-sm font-medium">
                          {formatAssetAmount(
                            parseFloat(statement.begin_balance),
                            statement.asset_code
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Additions</p>
                        <p className="text-sm font-medium text-green-600">
                          +
                          {formatAssetAmount(parseFloat(statement.additions), statement.asset_code)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Net Income</p>
                        <p className="text-sm font-medium text-blue-600">
                          +
                          {formatAssetAmount(
                            parseFloat(statement.net_income),
                            statement.asset_code
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ending Balance</p>
                        <p className="text-sm font-semibold">
                          {formatAssetAmount(
                            parseFloat(statement.end_balance),
                            statement.asset_code
                          )}
                        </p>
                      </div>
                    </div>

                    {statement.rate_of_return_mtd && (
                      <div className="mt-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          Return: {(parseFloat(statement.rate_of_return_mtd) * 100).toFixed(2)}% MTD
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-blue-50 rounded-full">
                  <Info className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium">No statements available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Statements are generated monthly. Your first statement will be available at the
                  end of your first full month of investment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Monthly Statements</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Statements are generated on the first business day of each month for the previous
            month's activity
          </p>
          <p>
            • Each statement shows your beginning balance, additions, withdrawals, net income, and
            ending balance
          </p>
          <p>• You can download PDF versions of your statements for your records</p>
          <p>• If you have questions about a statement, please contact your administrator</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatementsPage;
