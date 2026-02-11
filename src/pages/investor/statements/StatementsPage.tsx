import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Button,
} from "@/components/ui";
import { FileText, Calendar, TrendingUp, Info, AlertCircle, Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { PageShell } from "@/components/layout/PageShell";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatInvestorAmount, getAssetName } from "@/utils/assets";
import { useToast } from "@/hooks";
import {
  useMonthlyStatements,
  useStatementYears,
  useStatementAssets,
  type MonthlyStatement,
} from "@/hooks/data";
import { logError } from "@/lib/logger";

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

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleString("default", { month: "long" });
  };

  const handleDownload = async (statement: MonthlyStatement) => {
    try {
      setDownloadingId(statement.id);

      const monthName = getMonthName(statement.period_month);
      const periodLabel = `${monthName} ${statement.period_year}`;

      // Lazy load PDF generator to keep bundle small
      const { generatePDF } = await import("@/lib/pdf/statementGenerator");
      const blob = await generatePDF({
        investor: { name: "Investor Statement", id: "", accountNumber: "" },
        period: { month: statement.period_month, year: statement.period_year, start: "", end: "" },
        summary: { total_aum: 0, total_pnl: 0, total_fees: 0 },
        positions: [
          {
            asset_code: statement.asset_code,
            opening_balance: Number(statement.begin_balance || 0),
            additions: Number(statement.additions || 0),
            redemptions: Number(statement.redemptions || 0),
            yield_earned: Number(statement.net_income || 0),
            closing_balance: Number(statement.end_balance || 0),
          },
        ],
      });

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `statement-${statement.asset_code}-${periodLabel}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Statement Downloaded",
        description: `${periodLabel} statement saved as PDF.`,
      });
    } catch (error) {
      logError("StatementsPage.handleDownload", error, { statementId: statement.id });
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <PageShell maxWidth="narrow">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-1/3"></div>
          <div className="h-64 bg-white/5 rounded"></div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="narrow">
      <PageHeader
        title="Monthly Statements"
        subtitle="Access your monthly investment statements"
        icon={FileText}
      />

      <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
              Year
            </label>
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

          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
              Asset
            </label>
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
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading statements: {(error as Error).message}</AlertDescription>
        </Alert>
      ) : statements && statements.length > 0 ? (
        <div className="space-y-4">
          {statements.map((statement) => (
            <div
              key={statement.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-base font-display font-semibold text-white">
                    {getMonthName(statement.period_month)} {statement.period_year}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 inline-flex items-center gap-1">
                    <CryptoIcon symbol={statement.asset_code} className="h-3.5 w-3.5" />
                    {statement.fund_name}
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-white/5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Beginning Balance</p>
                  <p className="text-sm font-mono font-medium text-white">
                    {formatInvestorAmount(
                      parseFloat(statement.begin_balance) || 0,
                      statement.asset_code
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Additions</p>
                  <p className="text-sm font-mono font-medium text-emerald-400">
                    +
                    {formatInvestorAmount(
                      parseFloat(statement.additions) || 0,
                      statement.asset_code
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Net Income</p>
                  <p className="text-sm font-mono font-medium text-indigo-400">
                    +
                    {formatInvestorAmount(
                      parseFloat(statement.net_income) || 0,
                      statement.asset_code
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Ending Balance</p>
                  <p className="text-sm font-mono font-semibold text-white">
                    {formatInvestorAmount(
                      parseFloat(statement.end_balance) || 0,
                      statement.asset_code
                    )}
                  </p>
                </div>
              </div>

              {statement.rate_of_return_mtd && (
                <div className="mt-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-mono font-medium text-emerald-400">
                    Return: {(parseFloat(statement.rate_of_return_mtd) || 0).toFixed(2)}% MTD
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm py-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                <Info className="h-8 w-8 text-indigo-400" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-white">No statements available</p>
              <p className="text-sm text-muted-foreground mt-1">
                Statements are generated monthly. Your first statement will be available at the end
                of your first full month of investment.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4">
        <p className="text-sm font-medium text-white mb-2">About Monthly Statements</p>
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p>
            Statements are generated on the first business day of each month for the previous
            month's activity.
          </p>
          <p>
            Each statement shows your beginning balance, additions, withdrawals, net income, and
            ending balance.
          </p>
          <p>You can download PDF versions of your statements for your records.</p>
          <p>If you have questions about a statement, please contact your administrator.</p>
        </div>
      </div>
    </PageShell>
  );
};

export default StatementsPage;
