import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Calendar, TrendingUp, Info, AlertCircle, Download, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getAssetConfig, getAssetName } from "@/utils/assets";
import { useToast } from "@/hooks/use-toast";

const StatementsPage = () => {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user's statements from investor_fund_performance (V2)
  const {
    data: statements,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["monthly-statements", selectedYear, selectedAsset],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Query V2 Performance Table joined with Periods (reporting purpose only)
      let query = supabase
        .from("investor_fund_performance")
        .select(`
          id,
          fund_name,
          mtd_beginning_balance,
          mtd_additions,
          mtd_redemptions,
          mtd_net_income,
          mtd_ending_balance,
          mtd_rate_of_return,
          purpose,
          period:statement_periods!inner(
            year,
            month,
            period_end_date
          )
        `)
        .eq("investor_id", user.id)
        .eq("period.year", parseInt(selectedYear))
        .or("purpose.is.null,purpose.eq.reporting")
        .order("period(period_end_date)", { ascending: false });

      if (selectedAsset !== "all") {
        query = query.eq("fund_name", selectedAsset);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform data to match UI
      return (data || []).map((record: any) => ({
        id: record.id,
        period_year: record.period.year,
        period_month: record.period.month,
        asset_code: record.fund_name,
        begin_balance: record.mtd_beginning_balance?.toString() || "0",
        additions: record.mtd_additions?.toString() || "0",
        redemptions: record.mtd_redemptions?.toString() || "0",
        net_income: record.mtd_net_income?.toString() || "0",
        end_balance: record.mtd_ending_balance?.toString() || "0",
        rate_of_return_mtd: record.mtd_rate_of_return?.toString() || "0",
        report_month: record.period.period_end_date, // YYYY-MM-DD
      }));
    },
  });

  // Fetch available years
  const { data: availableYears } = useQuery({
    queryKey: ["statement-years"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [new Date().getFullYear()];

      // Get distinct years from periods linked to user performance
      // Supabase doesn't support distinct on joined columns easily in one go via JS client usually
      // Fetch all periods for user
      const { data } = await supabase
        .from("investor_fund_performance")
        .select("period:statement_periods(year)")
        .eq("investor_id", user.id);
      
      const years = new Set<number>();
      data?.forEach((d: any) => {
        if (d.period?.year) years.add(d.period.year);
      });
      
      const sorted = Array.from(years).sort((a, b) => b - a);
      return sorted.length > 0 ? sorted : [new Date().getFullYear()];
    },
  });

  // Fetch available assets
  const { data: availableAssets } = useQuery({
    queryKey: ["statement-assets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("investor_fund_performance")
        .select("fund_name") // distinct not directly supported in select string easily without rpc sometimes
        .eq("investor_id", user.id);

      const assets = new Set<string>();
      data?.forEach((d: any) => {
        if (d.fund_name) assets.add(d.fund_name);
      });
      
      return Array.from(assets).sort();
    },
  });

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleString("default", { month: "long" });
  };

  const formatAssetAmount = (value: number, assetCode: string): string => {
    const config = getAssetConfig(assetCode);
    const decimals = config?.decimals || 4;
    // Use symbol from config or fallback to code
    // Ensure we don't use "$" for everything unless it's USD
    const symbol = config?.symbol || assetCode;

    return `${value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })} ${symbol}`;
  };

  const handleDownload = async (statement: any) => {
    try {
      setDownloadingId(statement.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch the period_id for this statement
      const { data: periodData } = await supabase
        .from("statement_periods")
        .select("id")
        .eq("year", statement.period_year)
        .eq("month", statement.period_month)
        .single();

      if (!periodData) {
        throw new Error("Statement period not found");
      }

      // Fetch the generated statement HTML
      const { data: generatedStatement, error: fetchError } = await supabase
        .from("generated_statements")
        .select("html_content")
        .eq("period_id", periodData.id)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !generatedStatement?.html_content) {
        throw new Error("Statement not yet generated. Please contact support.");
      }

      // Add print-optimized CSS to the HTML
      const printStyles = `
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @page { size: A4; margin: 10mm; }
          }
        </style>
      `;
      
      // Insert print styles before closing </head>
      const htmlWithPrintStyles = generatedStatement.html_content.replace(
        '</head>',
        `${printStyles}</head>`
      );

      // Open in new window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error("Pop-up blocked. Please allow pop-ups for this site.");
      }

      printWindow.document.write(htmlWithPrintStyles);
      printWindow.document.close();

      // Wait for content to load, then trigger print dialog
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
      {/* Header */}
      <PageHeader 
        title="Monthly Statements" 
        subtitle="Access your monthly investment statements"
        icon={FileText}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Statements</CardTitle>
          <CardDescription>Select year and asset to view specific statements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {/* Year Filter */}
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

            {/* Asset Filter */}
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

      {/* Statements List */}
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading statements: {error.message}</AlertDescription>
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

      {/* Info Card */}
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
