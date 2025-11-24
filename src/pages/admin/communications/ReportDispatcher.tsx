import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { FileText, Upload, Send, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type ReportLog = {
  id: string;
  recipient_name: string; // From email_logs metadata or join
  subject: string;
  sent_at: string;
  status: string;
};

type InvestorOption = {
  id: string;
  email: string;
  name: string;
};

export default function ReportDispatcher() {
  const [reports, setReports] = useState<ReportLog[]>([]);
  const [investors, setInvestors] = useState<InvestorOption[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedInvestorId, setSelectedInvestorId] = useState("");
  const [reportType, setReportType] = useState("monthly");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvestors();
    fetchHistory();
  }, []);

  const fetchInvestors = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("role", "investor");

    if (data) {
      setInvestors(
        data.map((p) => ({
          id: p.id,
          email: p.email,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
        }))
      );
    }
  };

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      // Filtering for reports in email_logs
      const { data } = await supabase
        .from("email_logs")
        .select("*")
        .eq("template", "investor_report") // Assuming template name or filter by subject/type
        // If 'template' column is used for type, great. If not, we might need to infer or add a column.
        // The previous file used 'email_type' in the INSERT. Let's check if email_logs has 'email_type'.
        // The migration 20251118_create_email_logs.sql wasn't shown fully but 'send-notification-email' inserts 'template'.
        // 'send-investor-report' inserts 'email_type': 'investor_report'.
        // So we filter by that.
        // Wait, does email_logs have email_type? The notification function uses 'template'.
        // Let's assume we filter by 'template' or 'email_type' depending on what's there.
        // I'll try to select all and filter in client or just show all for now.
        .order("sent_at", { ascending: false })
        .limit(20);

      if (data) {
        setReports(
          data.map((log: any) => ({
            id: log.id,
            recipient_name: log.recipient_name || log.to, // EF inserts recipient_name
            subject: log.subject,
            sent_at: log.sent_at,
            status: log.status,
          }))
        );
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadAndSend = async () => {
    if (!selectedFile || !selectedInvestorId) {
      toast({
        title: "Validation Error",
        description: "Please select a file and an investor.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const investor = investors.find((i) => i.id === selectedInvestorId);
      if (!investor) throw new Error("Investor not found");

      // 1. Upload File
      const fileName = `${reportType}_${investor.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("documents") // Ensure this bucket exists
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(fileName);

      // 3. Invoke Edge Function
      const { error: invokeError } = await supabase.functions.invoke("send-investor-report", {
        body: {
          to: investor.email,
          investorName: investor.name,
          reportMonth: new Date().toISOString().slice(0, 7), // Current month YYYY-MM
          htmlContent: `
            <div style="font-family: Arial, sans-serif;">
              <h2>Your ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report is Ready</h2>
              <p>Dear ${investor.name},</p>
              <p>Please find your report attached or view it securely via the link below:</p>
              <p><a href="${publicUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Report</a></p>
              <p>Best regards,<br>Indigo Yield Team</p>
            </div>
          `,
        },
      });

      if (invokeError) throw invokeError;

      toast({
        title: "Report Sent",
        description: `Successfully sent ${selectedFile.name} to ${investor.name}.`,
      });

      // Reset and refresh
      setSelectedFile(null);
      setSelectedInvestorId("");
      fetchHistory();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send report.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const columns = [
    {
      header: "Recipient",
      accessorKey: "recipient_name" as keyof ReportLog,
      className: "font-medium",
    },
    { header: "Subject", accessorKey: "subject" as keyof ReportLog },
    {
      header: "Date",
      accessorKey: "sent_at" as keyof ReportLog,
      cell: (item: ReportLog) => new Date(item.sent_at).toLocaleString(),
    },
    {
      header: "Status",
      accessorKey: "status" as keyof ReportLog,
      cell: (item: ReportLog) => (
        <Badge
          variant={item.status === "sent" ? "default" : "destructive"}
          className={item.status === "sent" ? "bg-green-600" : ""}
        >
          {item.status === "sent" ? (
            <CheckCircle className="w-3 h-3 mr-1" />
          ) : (
            <AlertCircle className="w-3 h-3 mr-1" />
          )}
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
            Report Dispatcher
          </h1>
          <p className="text-muted-foreground">Manually upload and send reports to investors.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <Card className="lg:col-span-1 border-t-4 border-t-indigo-600 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <Upload className="w-5 h-5" />
              Send New Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="investor">Select Investor</Label>
              <select
                id="investor"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedInvestorId}
                onChange={(e) => setSelectedInvestorId(e.target.value)}
              >
                <option value="">Select an investor...</option>
                {investors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Report Type</Label>
              <select
                id="type"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="monthly">Monthly Statement</option>
                <option value="quarterly">Quarterly Report</option>
                <option value="annual">Annual Statement</option>
                <option value="tax">Tax Document (K-1)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Report File (PDF)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>

            <Button
              onClick={handleUploadAndSend}
              disabled={isUploading || !selectedFile || !selectedInvestorId}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* History List */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Sent Reports History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                <p className="mt-2 text-muted-foreground">Loading history...</p>
              </div>
            ) : (
              <ResponsiveTable
                data={reports}
                columns={columns}
                keyExtractor={(item) => item.id}
                emptyMessage="No reports sent recently."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
