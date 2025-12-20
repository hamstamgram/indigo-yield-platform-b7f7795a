import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Download, Eye, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReportsApi } from "@/services/api/reportsApi";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { renderReportToHtml } from "@/components/reports/InvestorReportTemplate";
import { InvestorData, InvestorFund } from "@/types/investor-report";

interface Investor {
  id: string;
  name: string;
  email: string;
}

export function SingleReportGenerator() {
  const [selectedInvestor, setSelectedInvestor] = useState<string>("");
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  // Fetch Active Investors (Profiles)
  const { data: investors, isLoading: isLoadingInvestors } = useQuery({
    queryKey: ["active-investors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("status", "active")
        .eq("is_admin", false)
        .order("first_name");

      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
        email: p.email,
      })) as Investor[];
    },
  });

  // Helper formatters for the new template
  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined || val === 0) return '-';
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatNetIncome = (val: number | null | undefined): string => {
    if (val === null || val === undefined || val === 0) return '-';
    const formatted = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const formatRate = (val: number | null | undefined): string => {
    if (val === null || val === undefined || val === 0) return '-';
    const pct = (val * 100).toFixed(2);
    return val >= 0 ? `+${pct}%` : `${pct}%`;
  };

  // Fetch Report Data for HTML Preview/Sending
  const fetchReportHtmlData = async (): Promise<{ investorData: InvestorData; investor: Investor } | null> => {
    if (!selectedInvestor || !reportDate) return null;

    // 1. Get Investor Details
    const investor = investors?.find((i) => i.id === selectedInvestor);
    if (!investor) throw new Error("Investor not found");

    const [yearStr, monthStr] = reportDate.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    // 2. Get Statement Period
    const { data: period } = await supabase
      .from("statement_periods")
      .select("id, period_end_date")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (!period) throw new Error(`No statement period found for ${reportDate}`);

    // 3. Fetch Performance Reports (V2)
    const { data: reports, error } = await (supabase as any)
      .from("investor_fund_performance")
      .select("*")
      .eq("investor_id", selectedInvestor)
      .eq("period_id", period.id);

    if (error) throw error;
    if (!reports || reports.length === 0)
      throw new Error(`No report data found for ${reportDate}`);

    // 4. Map to InvestorData structure (new format)
    const investorData: InvestorData = {
      name: investor.name,
      reportDate: format(parseISO(period.period_end_date), "MMMM d, yyyy"),
      funds: reports.map((r: any): InvestorFund => {
        // Normalize fund name to match FUND_ICONS keys
        const assetCode = r.fund_name?.toUpperCase() || 'USDC';
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

    return { investorData, investor };
  };

  const handlePreviewEmail = async () => {
    try {
      setIsGenerating(true);
      const data = await fetchReportHtmlData();
      if (!data) return;

      const html = renderReportToHtml(data.investorData);
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
    try {
      setIsSending(true);
      const data = await fetchReportHtmlData();
      if (!data) return;

      const htmlContent = renderReportToHtml(data.investorData);

      // Send via Edge Function
      const { error } = await supabase.functions.invoke("send-investor-report", {
        body: {
          to: data.investor.email,
          investorName: data.investor.name,
          reportMonth: reportDate.substring(0, 7),
          htmlContent: htmlContent,
        },
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Report sent to ${data.investor.email}`,
      });
    } catch (error: any) {
      console.error("Send failed:", error);
      toast({
        title: "Send Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
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
      // Determine the reporting period (First to Last day of the selected month)
      const dateObj = new Date(reportDate);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();

      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString(); // Last day of month

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
        // Trigger Download
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
      console.error("Generation failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
                {investors?.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {" "}
                    {/* NOTE: This passes Investor ID. The API needs to handle it or we resolve Profile ID */}
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
              value={reportDate.substring(0, 7)} // YYYY-MM format
              onChange={(e) => setReportDate(e.target.value + "-01")}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 gap-2">
          <Button
            variant="outline"
            onClick={handlePreviewEmail}
            disabled={isGenerating || isSending || !selectedInvestor}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Email
          </Button>

          <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={isGenerating || isSending || !selectedInvestor}
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
            disabled={isGenerating || isSending || !selectedInvestor}
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
