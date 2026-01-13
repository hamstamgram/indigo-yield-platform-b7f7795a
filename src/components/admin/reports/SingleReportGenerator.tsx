import { useState, useMemo } from "react";
import {
  Button, Label, Input,
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui";
import { useToast } from "@/hooks";
import { logError } from "@/lib/logger";
import { Loader2, FileText, Download, Eye, Send } from "lucide-react";
import { ReportsApi } from "@/services/api/reportsApi";
import { format, parseISO } from "date-fns";
import { renderReportToHtml } from "@/components/reports/InvestorReportTemplate";
import { InvestorData, InvestorFund } from "@/types/domains";
import {
  useActiveInvestorsForReports,
  useStatementPeriod,
  useInvestorReportData,
  useSendInvestorReport,
} from "@/hooks/data";

export function SingleReportGenerator() {
  const [selectedInvestor, setSelectedInvestor] = useState<string>("");
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Parse year/month from reportDate
  const { year, month } = useMemo(() => {
    const [yearStr, monthStr] = reportDate.split("-");
    return { year: parseInt(yearStr), month: parseInt(monthStr) };
  }, [reportDate]);

  // Data hooks
  const { investors, isLoading: isLoadingInvestors } = useActiveInvestorsForReports();
  const { period } = useStatementPeriod(year, month);
  const { performanceData } = useInvestorReportData(
    selectedInvestor,
    period?.id || ""
  );
  const { sendReport, isSending } = useSendInvestorReport();

  // Get selected investor details
  const selectedInvestorData = useMemo(
    () => investors.find((i) => i.id === selectedInvestor),
    [investors, selectedInvestor]
  );

  // Helper formatters for the template
  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined || val === 0) return "-";
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatNetIncome = (val: number | null | undefined): string => {
    if (val === null || val === undefined || val === 0) return "-";
    const formatted = Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return val >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const formatRate = (val: number | null | undefined): string => {
    if (val === null || val === undefined || val === 0) return "-";
    const pct = (val * 100).toFixed(2);
    return val >= 0 ? `+${pct}%` : `${pct}%`;
  };

  // Build investor data for template
  const buildInvestorData = (): InvestorData | null => {
    if (!selectedInvestorData || !period || performanceData.length === 0) return null;

    return {
      name: selectedInvestorData.name,
      reportDate: format(parseISO(period.period_end_date), "MMMM d, yyyy"),
      funds: performanceData.map((r: any): InvestorFund => {
        const assetCode = r.fund_name?.toUpperCase() || "USDC";
        const fundName = `${assetCode} YIELD FUND`;

        return {
          name: fundName,
          currency: assetCode,
          begin_balance_mtd: formatValue(r.mtd_beginning_balance),
          begin_balance_qtd: formatValue(r.qtd_beginning_balance),
          begin_balance_ytd: formatValue(r.ytd_beginning_balance),
          begin_balance_itd: formatValue(r.itd_beginning_balance),
          additions_mtd: formatValue(r.mtd_additions),
          additions_qtd: formatValue(r.qtd_additions),
          additions_ytd: formatValue(r.ytd_additions),
          additions_itd: formatValue(r.itd_additions),
          redemptions_mtd: formatValue(r.mtd_redemptions),
          redemptions_qtd: formatValue(r.qtd_redemptions),
          redemptions_ytd: formatValue(r.ytd_redemptions),
          redemptions_itd: formatValue(r.itd_redemptions),
          net_income_mtd: formatNetIncome(r.mtd_net_income),
          net_income_qtd: formatNetIncome(r.qtd_net_income),
          net_income_ytd: formatNetIncome(r.ytd_net_income),
          net_income_itd: formatNetIncome(r.itd_net_income),
          ending_balance_mtd: formatValue(r.mtd_ending_balance),
          ending_balance_qtd: formatValue(r.qtd_ending_balance),
          ending_balance_ytd: formatValue(r.ytd_ending_balance),
          ending_balance_itd: formatValue(r.itd_ending_balance),
          return_rate_mtd: formatRate(r.mtd_rate_of_return),
          return_rate_qtd: formatRate(r.qtd_rate_of_return),
          return_rate_ytd: formatRate(r.ytd_rate_of_return),
          return_rate_itd: formatRate(r.itd_rate_of_return),
        };
      }),
    };
  };

  const handlePreviewEmail = async () => {
    try {
      setIsGenerating(true);
      const investorData = buildInvestorData();
      
      if (!investorData) {
        toast({
          title: "No Data",
          description: `No report data found for ${reportDate}`,
          variant: "destructive",
        });
        return;
      }

      const html = renderReportToHtml(investorData);
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch (error: any) {
      toast({
        title: "Preview Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    const investorData = buildInvestorData();
    
    if (!investorData || !selectedInvestorData) {
      toast({
        title: "No Data",
        description: `No report data found for ${reportDate}`,
        variant: "destructive",
      });
      return;
    }

    const htmlContent = renderReportToHtml(investorData);

    await sendReport({
      to: selectedInvestorData.email,
      investorName: selectedInvestorData.name,
      reportMonth: reportDate.substring(0, 7),
      htmlContent,
    });
  };

  const handleGeneratePDF = async () => {
    if (!selectedInvestor || !reportDate) {
      toast({
        title: "Validation Error",
        description: "Please select an investor and a date.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const dateObj = new Date(reportDate);
      const reportYear = dateObj.getFullYear();
      const reportMonth = dateObj.getMonth();

      const startDate = new Date(reportYear, reportMonth, 1).toISOString();
      const endDate = new Date(reportYear, reportMonth + 1, 0).toISOString();

      const result = await ReportsApi.generateReportNow({
        reportType: "monthly_statement",
        format: "pdf",
        filters: {
          dateFrom: startDate,
          dateTo: endDate,
          investorId: selectedInvestor,
        },
        parameters: {
          includeCharts: true,
          confidential: true,
        },
      });

      if (result.success && result.data) {
        const blob = new Blob([result.data as BlobPart], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename || `Report_${selectedInvestor}_${reportDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Success",
          description: "Report generated and downloaded successfully.",
        });
      } else {
        throw new Error(result.error || "Failed to generate report.");
      }
    } catch (error) {
      logError("report.generate", error, { investorId: selectedInvestor, periodId: period?.id });
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isActionDisabled = isGenerating || isSending || !selectedInvestor;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Generate Individual Report
        </CardTitle>
        <CardDescription>
          Create PDF statements or send HTML email reports for a specific investor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Investor Selection */}
          <div className="space-y-2">
            <Label>Select Investor</Label>
            <Select
              value={selectedInvestor}
              onValueChange={setSelectedInvestor}
              disabled={isLoadingInvestors}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={isLoadingInvestors ? "Loading..." : "Search investor..."}
                />
              </SelectTrigger>
              <SelectContent>
                {investors.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Report Month</Label>
            <Input
              type="month"
              value={reportDate.substring(0, 7)}
              onChange={(e) => setReportDate(e.target.value + "-01")}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 gap-2">
          <Button
            variant="outline"
            onClick={handlePreviewEmail}
            disabled={isActionDisabled}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Email
          </Button>

          <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={isActionDisabled}
          >
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Email
          </Button>

          <Button
            onClick={handleGeneratePDF}
            disabled={isActionDisabled}
            className="min-w-[150px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
