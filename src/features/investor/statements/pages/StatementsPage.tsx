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
import { useAuth } from "@/services/auth";
import { format } from "date-fns";
import { logError } from "@/lib/logger";

const StatementsPage = () => {
  const { user, profile } = useAuth();
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

      // Build period boundaries
      const periodStart = new Date(statement.period_year, statement.period_month - 1, 1);
      const periodEnd = new Date(statement.period_year, statement.period_month, 0);

      const mtdBeginBalance = parseFloat(statement.begin_balance) || 0;
      const mtdAdditions = parseFloat(statement.additions) || 0;
      const mtdRedemptions = parseFloat(statement.redemptions) || 0;
      const mtdNetIncome = parseFloat(statement.net_income) || 0;
      const mtdEndBalance = parseFloat(statement.end_balance) || 0;
      const mtdRateOfReturn = parseFloat(statement.rate_of_return_mtd) || 0;

      // Lazy load PDF generator to keep bundle small
      const { generatePDF } = await import("@/lib/pdf/statementGenerator");
      const blob = await generatePDF({
        investor: {
          name: profile?.first_name
            ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
            : user?.email || "Investor",
          id: user?.id || "",
          accountNumber: "",
          email: user?.email,
        },
        period: {
          month: statement.period_month,
          year: statement.period_year,
          start: format(periodStart, "yyyy-MM-dd"),
          end: format(periodEnd, "yyyy-MM-dd"),
        },
        funds: [
          {
            fund_name: statement.fund_name || `${statement.asset_code} YIELD FUND`,
            asset_code: statement.asset_code,
            mtd_beginning_balance: mtdBeginBalance,
            mtd_additions: mtdAdditions,
            mtd_redemptions: mtdRedemptions,
            mtd_net_income: mtdNetIncome,
            mtd_ending_balance: mtdEndBalance,
            mtd_rate_of_return: mtdRateOfReturn,
            qtd_beginning_balance: mtdBeginBalance,
            qtd_additions: mtdAdditions,
            qtd_redemptions: mtdRedemptions,
            qtd_net_income: mtdNetIncome,
            qtd_ending_balance: mtdEndBalance,
            qtd_rate_of_return: mtdRateOfReturn,
            ytd_beginning_balance: mtdBeginBalance,
            ytd_additions: mtdAdditions,
            ytd_redemptions: mtdRedemptions,
            ytd_net_income: mtdNetIncome,
            ytd_ending_balance: mtdEndBalance,
            ytd_rate_of_return: mtdRateOfReturn,
            itd_beginning_balance: mtdBeginBalance,
            itd_additions: mtdAdditions,
            itd_redemptions: mtdRedemptions,
            itd_net_income: mtdNetIncome,
            itd_ending_balance: mtdEndBalance,
            itd_rate_of_return: mtdRateOfReturn,
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
      <PageHeader title="Statements" icon={FileText} />

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
                  <p className="text-sm font-mono font-medium text-yield">
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
                  <TrendingUp className="h-4 w-4 text-yield" />
                  <span className="text-sm font-mono font-medium text-yield">
                    Return: {(parseFloat(statement.rate_of_return_mtd) || 0).toFixed(3)}% MTD
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
    </PageShell>
  );
};

export default StatementsPage;
