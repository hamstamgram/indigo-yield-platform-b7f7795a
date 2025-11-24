import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Send,
  Calendar,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, parseISO } from "date-fns";
import { generateInvestorReportHtml, ReportData } from "@/utils/reportGenerator";

interface InvestorReport {
  investor_id: string;
  investor_name: string;
  investor_email: string; // Legacy: primary email
  investor_emails: Array<{
    email: string;
    is_primary: boolean;
    verified: boolean;
  }>; // All emails for multi-recipient sending
  assets: Array<{
    asset_code: string;
    opening_balance: number;
    closing_balance: number;
    additions: number;
    withdrawals: number;
    yield_earned: number;
    report_id: string;
  }>;
  total_value: number;
  total_yield: number;
  has_reports: boolean;
  report_count: number;
}

const InvestorReports = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<InvestorReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(subMonths(new Date(), 1), "yyyy-MM")
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sendingReports, setSendingReports] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch real reports from database
  const fetchReports = async () => {
    try {
      setLoading(true);
      console.log("Fetching reports for month:", selectedMonth);

      const reportDate = `${selectedMonth}-01`;

      // Fetch all investors
      const { data: investors, error: investorsError } = await supabase
        .from("investors")
        .select("id, name, email")
        .order("name");

      if (investorsError) throw investorsError;

      if (!investors || investors.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      // TODO: Fetch investor emails when investor_emails table is created
      // Stubbed - investor_emails table doesn't exist yet
      const emailsByInvestor: Record<string, any[]> = {};

      /* Original code - restore when investor_emails table is created:
      const { data: allInvestorEmails, error: emailsError } = await supabase
        .from("investor_emails")
        .select("investor_id, email, is_primary, verified")
        .order("investor_id, is_primary", { ascending: false });

      const emailsByInvestor = (allInvestorEmails || []).reduce(
        (acc, emailRecord) => {
          if (!acc[emailRecord.investor_id]) {
            acc[emailRecord.investor_id] = [];
          }
          acc[emailRecord.investor_id].push({
            email: emailRecord.email,
            is_primary: emailRecord.is_primary,
            verified: emailRecord.verified,
          });
          return acc;
        },
        {} as Record<string, typeof allInvestorEmails>
      );
      */

      // Fetch monthly reports for the selected month
      const { data: monthlyReports, error: reportsError } = await supabase
        .from("investor_monthly_reports")
        .select("*")
        .eq("report_month", reportDate)
        .order("investor_id, asset_code");

      if (reportsError) throw reportsError;

      // Group reports by investor
      const reportsByInvestor = (monthlyReports || []).reduce(
        (acc, report) => {
          if (!acc[report.investor_id]) {
            acc[report.investor_id] = [];
          }
          acc[report.investor_id].push(report);
          return acc;
        },
        {} as Record<string, typeof monthlyReports>
      );

      // Build investor report summaries
      const investorReports: InvestorReport[] = investors.map((investor) => {
        const investorReports = reportsByInvestor[investor.id] || [];
        const hasReports = investorReports.length > 0;

        const assets = investorReports.map((report) => ({
          asset_code: report.asset_code,
          opening_balance: Number(report.opening_balance) || 0,
          closing_balance: Number(report.closing_balance) || 0,
          additions: Number(report.additions) || 0,
          withdrawals: Number(report.withdrawals) || 0,
          yield_earned: Number(report.yield_earned) || 0,
          report_id: report.id,
        }));

        const total_value = assets.reduce((sum, asset) => sum + asset.closing_balance, 0);
        const total_yield = assets.reduce((sum, asset) => sum + asset.yield_earned, 0);

        // Get all emails for this investor
        const investorEmails = emailsByInvestor[investor.id] || [];

        // Fallback to legacy email if no emails found
        if (investorEmails.length === 0 && investor.email) {
          investorEmails.push({
            email: investor.email,
            is_primary: true,
            verified: false,
          });
        }

        // Get primary email for legacy field
        const primaryEmail = investorEmails.find((e) => e.is_primary)?.email || investor.email;

        return {
          investor_id: investor.id,
          investor_name: investor.name || "Unknown",
          investor_email: primaryEmail, // Legacy: primary email only
          investor_emails: investorEmails, // All emails for multi-recipient sending
          assets,
          total_value,
          total_yield,
          has_reports: hasReports,
          report_count: assets.length,
        };
      });

      setReports(investorReports);

      toast({
        title: "Reports Loaded",
        description: `Loaded ${investorReports.length} investor records for ${format(parseISO(reportDate), "MMMM yyyy")}`,
      });
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error Loading Reports",
        description: error.message || "Failed to load investor reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

  const handlePreviewReport = (investor: InvestorReport) => {
    const reportData: ReportData = {
      investorName: investor.investor_name,
      reportDate: format(parseISO(`${selectedMonth}-01`), "MMMM d, yyyy"),
      funds: investor.assets.map((asset) => ({
        fundName: `${asset.asset_code} YIELD FUND`,
        currency: asset.asset_code,
        metrics: {
          begin_balance_mtd: asset.opening_balance.toString(),
          begin_balance_qtd: "-",
          begin_balance_ytd: "-",
          begin_balance_itd: "-",

          additions_mtd: asset.additions.toString(),
          additions_qtd: "-",
          additions_ytd: "-",
          additions_itd: "-",

          redemptions_mtd: asset.withdrawals.toString(),
          redemptions_qtd: "-",
          redemptions_ytd: "-",
          redemptions_itd: "-",

          net_income_mtd: asset.yield_earned.toString(),
          net_income_qtd: "-",
          net_income_ytd: "-",
          net_income_itd: "-",

          ending_balance_mtd: asset.closing_balance.toString(),
          ending_balance_qtd: "-",
          ending_balance_ytd: "-",
          ending_balance_itd: "-",

          return_rate_mtd: "0",
          return_rate_qtd: "-",
          return_rate_ytd: "-",
          return_rate_itd: "-",
        },
      })),
    };

    const html = generateInvestorReportHtml(reportData);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  // Send reports via email (placeholder for email integration)
  const handleSendReports = async () => {
    setSendingReports(true);
    try {
      const reportsToSend = reports.filter((r) => r.has_reports);

      if (reportsToSend.length === 0) {
        toast({
          title: "No Reports to Send",
          description: "Generate reports first before sending",
          variant: "destructive",
        });
        return;
      }

      // Calculate total recipients (all emails for all investors with reports)
      let totalRecipients = 0;
      const emailBatchData: Array<{
        investorId: string;
        investorName: string;
        recipientEmails: string[];
      }> = [];

      reportsToSend.forEach((report) => {
        // Get all recipient emails (verified + primary)
        const recipientEmails = report.investor_emails
          .filter((e) => e.verified || e.is_primary) // Send to verified emails + primary email
          .map((e) => e.email);

        // Fallback to legacy email if no emails found
        if (recipientEmails.length === 0 && report.investor_email) {
          recipientEmails.push(report.investor_email);
        }

        totalRecipients += recipientEmails.length;

        emailBatchData.push({
          investorId: report.investor_id,
          investorName: report.investor_name,
          recipientEmails,
        });
      });

      console.log("📧 Email Sending Summary:", {
        investors: reportsToSend.length,
        totalRecipients,
        emailBatchData,
      });

      // For MVP: Log the email batch data
      // In production: Call Supabase Edge Function or email service
      // Example production code:
      //
      // for (const batch of emailBatchData) {
      //   for (const recipientEmail of batch.recipientEmails) {
      //     await supabase.functions.invoke('send-investor-report', {
      //       body: {
      //         investorId: batch.investorId,
      //         recipientEmail: recipientEmail,
      //         reportMonth: selectedMonth,
      //       }
      //     });
      //   }
      // }

      toast({
        title: "Multi-Email Support Ready",
        description: `${reportsToSend.length} investors with ${totalRecipients} total recipients. Email service integration pending.`,
      });

      // For now, just show success
      // In production, this would actually send emails via Supabase Edge Function
    } catch (error: any) {
      console.error("Error sending reports:", error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send monthly reports",
        variant: "destructive",
      });
    } finally {
      setSendingReports(false);
    }
  };

  // View report details
  const handleViewDetails = (investor: InvestorReport) => {
    setSelectedInvestor(investor);
    setDetailsOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.investor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.investor_email.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === "generated") {
      matchesStatus = report.has_reports;
    } else if (statusFilter === "missing") {
      matchesStatus = !report.has_reports;
    }

    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalInvestors: reports.length,
    reportsGenerated: reports.filter((r) => r.has_reports).length,
    reportsMissing: reports.filter((r) => !r.has_reports).length,
    totalAUM: reports.reduce((sum, r) => sum + r.total_value, 0),
    totalYield: reports.reduce((sum, r) => sum + r.total_yield, 0),
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monthly Investor Reports</h1>
          <p className="text-muted-foreground">
            View and manage monthly investor reports (entered via Monthly Data Entry)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchReports} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleSendReports}
            disabled={sendingReports || stats.reportsGenerated === 0}
            variant="primary"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendingReports ? "Sending..." : `Send Reports (${stats.reportsGenerated})`}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvestors}</div>
            <p className="text-xs text-muted-foreground">Active investors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.reportsGenerated}</div>
            <p className="text-xs text-muted-foreground">Have report data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Reports</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.reportsMissing}</div>
            <p className="text-xs text-muted-foreground">Need generation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAUM)}</div>
            <p className="text-xs text-muted-foreground">Closing balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalYield)}
            </div>
            <p className="text-xs text-muted-foreground">Monthly earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const date = subMonths(new Date(), i);
              const monthValue = format(date, "yyyy-MM");
              return (
                <SelectItem key={monthValue} value={monthValue}>
                  {format(date, "MMMM yyyy")}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="generated">Generated</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search investors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Monthly Reports - {format(parseISO(`${selectedMonth}-01`), "MMMM yyyy")}
          </CardTitle>
          <CardDescription>
            Real database data from investor_monthly_reports and statements tables
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : 'Click "Generate Reports" to create reports from statements'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.investor_id}>
                    <TableCell className="font-medium">{report.investor_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>{report.investor_email}</span>
                        {report.investor_emails.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            +{report.investor_emails.length - 1} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {report.assets.length > 0 ? (
                          report.assets.map((asset) => (
                            <Badge key={asset.asset_code} variant="secondary" className="text-xs">
                              {asset.asset_code}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No assets</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={report.has_reports ? "default" : "outline"}
                        className={report.has_reports ? "bg-green-600" : ""}
                      >
                        {report.has_reports ? "Generated" : "Missing"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreviewReport(report)}
                          disabled={!report.has_reports}
                          title="Preview HTML Report"
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(report)}
                          disabled={!report.has_reports}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Report Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details - {selectedInvestor?.investor_name}</DialogTitle>
            <DialogDescription>
              {selectedInvestor?.investor_email} |{" "}
              {format(parseISO(`${selectedMonth}-01`), "MMMM yyyy")}
            </DialogDescription>
          </DialogHeader>

          {selectedInvestor && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(selectedInvestor.total_value)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Yield Earned</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedInvestor.total_yield)}
                  </p>
                </div>
              </div>

              {/* Email Recipients */}
              {selectedInvestor.investor_emails.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Report Recipients ({selectedInvestor.investor_emails.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedInvestor.investor_emails.map((emailObj, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-2 rounded ${
                          emailObj.is_primary ? "bg-indigo-50 border border-indigo-200" : "bg-muted"
                        }`}
                      >
                        <span className="text-sm flex-1">{emailObj.email}</span>
                        {emailObj.is_primary && (
                          <Badge variant="default" className="bg-indigo-600 text-xs">
                            Primary
                          </Badge>
                        )}
                        {emailObj.verified && (
                          <Badge variant="outline" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-Asset Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Asset Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Additions</TableHead>
                      <TableHead className="text-right">Withdrawals</TableHead>
                      <TableHead className="text-right">Yield</TableHead>
                      <TableHead className="text-right">Closing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvestor.assets.map((asset) => (
                      <TableRow key={asset.asset_code}>
                        <TableCell className="font-medium">
                          <Badge>{asset.asset_code}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.opening_balance)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(asset.additions)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(asset.withdrawals)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(asset.yield_earned)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(asset.closing_balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvestorReports;
