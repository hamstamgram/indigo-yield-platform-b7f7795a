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
import { generateInvestorReportHtml, ReportData } from "@/utils/reportGenerator";

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

  // Fetch Active Investors
  const { data: investors, isLoading: isLoadingInvestors } = useQuery({
    queryKey: ["active-investors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("id, name, email")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data as Investor[];
    },
  });

  // Fetch Report Data for HTML Preview/Sending
  const fetchReportHtmlData = async () => {
    if (!selectedInvestor || !reportDate) return null;

    // 1. Get Investor Details
    const investor = investors?.find((i) => i.id === selectedInvestor);
    if (!investor) throw new Error("Investor not found");

    const targetMonth = reportDate.substring(0, 7); // YYYY-MM

    // 2. Fetch Monthly Reports
    const { data: reports, error } = await supabase
      .from("investor_monthly_reports")
      .select("*")
      .eq("investor_id", selectedInvestor)
      .eq("report_month", `${targetMonth}-01`);

    if (error) throw error;
    if (!reports || reports.length === 0)
      throw new Error(`No report data found for ${targetMonth}`);

    // 3. Map to ReportData structure
    const reportData: ReportData = {
      investorName: investor.name,
      reportDate: format(parseISO(`${targetMonth}-01`), "MMMM d, yyyy"),
      funds: reports.map((r) => {
        let fundName = `${r.asset_code} YIELD FUND`;
        if (r.asset_code === "USDC") fundName = "Tokenized Gold";
        if (r.asset_code === "USDT") fundName = "Stablecoin Fund";

        return {
          fundName: fundName,
          currency: r.asset_code,
          metrics: {
            begin_balance_mtd: r.opening_balance?.toString() || "0",
            begin_balance_qtd: "-",
            begin_balance_ytd: "-",
            begin_balance_itd: "-",

            additions_mtd: r.additions?.toString() || "0",
            additions_qtd: "-",
            additions_ytd: "-",
            additions_itd: "-",

            redemptions_mtd: r.withdrawals?.toString() || "0",
            redemptions_qtd: "-",
            redemptions_ytd: "-",
            redemptions_itd: "-",

            net_income_mtd: r.yield_earned?.toString() || "0",
            net_income_qtd: "-",
            net_income_ytd: "-",
            net_income_itd: "-",

            ending_balance_mtd: r.closing_balance?.toString() || "0",
            ending_balance_qtd: "-",
            ending_balance_ytd: "-",
            ending_balance_itd: "-",

            return_rate_mtd: "0",
            return_rate_qtd: "-",
            return_rate_ytd: "-",
            return_rate_itd: "-",
          },
        };
      }),
    };

    return { reportData, investor };
  };

  const handlePreviewEmail = async () => {
    try {
      setIsGenerating(true);
      const data = await fetchReportHtmlData();
      if (!data) return;

      const html = generateInvestorReportHtml(data.reportData);
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

      const htmlContent = generateInvestorReportHtml(data.reportData);

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
        reportType: "monthly_statement", // Or 'performance_report'
        format: "pdf",
        userId: selectedInvestor, // We pass the investor PROFILE ID usually, but here we have Investor ID.
        // The API expects Profile ID (User ID). Let's resolve it.
        filters: {
          dateFrom: startDate,
          dateTo: endDate,
        },
        parameters: {
          includeCharts: true,
          confidential: true,
        },
      });

      if (result.success && result.data) {
        // Trigger Download
        const blob = new Blob([result.data], { type: "application/pdf" });
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
