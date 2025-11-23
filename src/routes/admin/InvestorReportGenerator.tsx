import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  generateReportForInvestor,
  generateReportsForAllInvestors,
  type fetchInvestorReportData,
} from "@/services/reportGenerationService";
import { Loader2, Mail, Eye, Send, CheckCircle2, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Investor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface SendResult {
  investorId: string;
  investorName: string;
  success: boolean;
  error?: string;
}

export default function InvestorReportGenerator() {
  const { toast } = useToast();

  // State
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [selectedInvestor, setSelectedInvestor] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewData, setPreviewData] = useState<Awaited<
    ReturnType<typeof fetchInvestorReportData>
  > | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = date.toISOString().slice(0, 7); // YYYY-MM
    const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    return { value, label };
  });

  // Set default to current month
  useEffect(() => {
    if (monthOptions.length > 0 && !selectedMonth) {
      setSelectedMonth(monthOptions[0].value);
    }
  }, [monthOptions, selectedMonth]);

  // Fetch investors
  useEffect(() => {
    fetchInvestors();
  }, []);

  async function fetchInvestors() {
    try {
      const { data, error } = await supabase
        .from("investors")
        .select("id, profile:profiles(first_name, last_name, email)")
        .eq("status", "active")
        .order("created_at");

      if (error) throw error;

      // Transform data to match Investor interface
      const investors = (data || []).map((inv: any) => ({
        id: inv.id,
        first_name: inv.profile?.first_name || "",
        last_name: inv.profile?.last_name || "",
        email: inv.profile?.email || "",
      }));

      setInvestors(investors);
    } catch (error) {
      console.error("Error fetching investors:", error);
      toast({
        title: "Error",
        description: "Failed to load investors. Please try again.",
        variant: "destructive",
      });
    }
  }

  async function handleGeneratePreview() {
    if (!selectedMonth) {
      toast({
        title: "Missing Information",
        description: "Please select a month for the report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setPreviewHtml("");
    setPreviewData(null);

    try {
      if (selectedInvestor === "all") {
        // Generate preview for first investor
        const firstInvestor = investors[0];
        if (!firstInvestor) {
          throw new Error("No investors found");
        }

        const report = await generateReportForInvestor(firstInvestor.id, selectedMonth);

        if (!report) {
          throw new Error(
            `No data found for ${firstInvestor.first_name} ${firstInvestor.last_name} in ${selectedMonth}`
          );
        }

        setPreviewHtml(report.html);
        setPreviewData(report.data);

        toast({
          title: "Preview Generated",
          description: `Showing preview for ${firstInvestor.first_name} ${firstInvestor.last_name}. All ${investors.length} investors will receive similar reports.`,
        });
      } else {
        // Generate preview for selected investor
        const report = await generateReportForInvestor(selectedInvestor, selectedMonth);

        if (!report) {
          const investor = investors.find((inv) => inv.id === selectedInvestor);
          throw new Error(
            `No data found for ${investor?.first_name} ${investor?.last_name} in ${selectedMonth}`
          );
        }

        setPreviewHtml(report.html);
        setPreviewData(report.data);

        toast({
          title: "Preview Generated",
          description: "Report preview is ready. Review it before sending.",
        });
      }
    } catch (error: any) {
      console.error("Error generating preview:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report preview.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSendReports() {
    if (!previewHtml) {
      toast({
        title: "No Preview",
        description: "Please generate a preview first.",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  }

  async function confirmSendReports() {
    setShowConfirmDialog(false);
    setIsSending(true);
    setSendResults([]);

    try {
      let reports;

      if (selectedInvestor === "all") {
        // Generate all reports
        reports = await generateReportsForAllInvestors(selectedMonth);

        if (reports.length === 0) {
          throw new Error(
            `No reports generated. Check if investors have data for ${selectedMonth}.`
          );
        }
      } else {
        // Generate single report
        const report = await generateReportForInvestor(selectedInvestor, selectedMonth);

        if (!report) {
          throw new Error("Failed to generate report.");
        }

        reports = [report];
      }

      // Send emails via Edge Function
      const results: SendResult[] = [];

      for (const report of reports) {
        try {
          const { error } = await supabase.functions.invoke("send-investor-report", {
            body: {
              to: report.data.email,
              investorName: report.data.investorName,
              reportMonth: selectedMonth,
              htmlContent: report.html,
            },
          });

          if (error) {
            results.push({
              investorId: report.data.investorId,
              investorName: report.data.investorName,
              success: false,
              error: error.message,
            });
          } else {
            results.push({
              investorId: report.data.investorId,
              investorName: report.data.investorName,
              success: true,
            });
          }
        } catch (error: any) {
          results.push({
            investorId: report.data.investorId,
            investorName: report.data.investorName,
            success: false,
            error: error.message || "Unknown error",
          });
        }

        // Rate limiting: 100ms delay between sends
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setSendResults(results);
      setShowResultsDialog(true);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      toast({
        title: "Reports Sent",
        description: `Successfully sent ${successCount} report(s). ${failCount > 0 ? `${failCount} failed.` : ""}`,
        variant: failCount > 0 ? "destructive" : "default",
      });
    } catch (error: any) {
      console.error("Error sending reports:", error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send reports.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  const selectedInvestorName =
    selectedInvestor === "all"
      ? `All Investors (${investors.length})`
      : investors.find((inv) => inv.id === selectedInvestor)
        ? `${investors.find((inv) => inv.id === selectedInvestor)?.first_name} ${
            investors.find((inv) => inv.id === selectedInvestor)?.last_name
          }`
        : "";

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Investor Report Generator</h1>
        <p className="text-gray-600 mt-2">
          Generate and send monthly investment reports to investors via email.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Select the month and investors for the report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Month Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Report Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Investor Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Investor(s)</label>
              <Select value={selectedInvestor} onValueChange={setSelectedInvestor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Investors ({investors.length})</SelectItem>
                  {investors.map((investor) => (
                    <SelectItem key={investor.id} value={investor.id}>
                      {investor.first_name} {investor.last_name} ({investor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedMonth && selectedInvestor && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900">Report Summary</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {selectedMonth} report for {selectedInvestorName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <Button
                onClick={handleGeneratePreview}
                disabled={!selectedMonth || isGenerating || isSending}
                className="flex-1"
                variant="outline"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Generate Preview
                  </>
                )}
              </Button>

              <Button
                onClick={handleSendReports}
                disabled={!previewHtml || isSending || isGenerating}
                className="flex-1"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Reports
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
            <CardDescription>
              Preview the generated report before sending
              {previewData && (
                <span className="block mt-1 text-xs text-gray-500">
                  Preview for: {previewData.investorName} ({previewData.email})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!previewHtml && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Eye className="w-12 h-12 mb-4" />
                <p className="text-sm">No preview generated yet</p>
                <p className="text-xs mt-1">Click "Generate Preview" to see the email</p>
              </div>
            )}

            {previewHtml && (
              <ScrollArea className="h-[600px] border rounded-lg">
                <div className="bg-white" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send Reports</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send reports to{" "}
              <span className="font-semibold">{selectedInvestorName}</span> for{" "}
              <span className="font-semibold">
                {monthOptions.find((m) => m.value === selectedMonth)?.label}
              </span>
              ?
              {selectedInvestor === "all" && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <strong>Warning:</strong> This will send {investors.length} emails. This action
                  cannot be undone.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSendReports}>Send Reports</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Results Dialog */}
      <AlertDialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Send Results</AlertDialogTitle>
            <AlertDialogDescription>
              Report sending completed. {sendResults.filter((r) => r.success).length} successful,{" "}
              {sendResults.filter((r) => !r.success).length} failed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-2 pr-4">
              {sendResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${
                    result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{result.investorName}</p>
                    {result.error && <p className="text-xs text-red-700 mt-1">{result.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowResultsDialog(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
