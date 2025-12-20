import { useState, useEffect, useCallback } from "react";
import { CryptoIcon } from "@/components/CryptoIcons";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Send,
  Calendar,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  CheckCircle2,
  Eye,
  Coins,
  Mail,
  Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, parseISO } from "date-fns";
import { renderReportToHtml } from "@/components/reports/InvestorReportTemplate";
import { InvestorData, InvestorFund } from "@/types/investor-report";
import { formatAssetWithSymbol } from "@/utils/formatters";
import { PerformanceDataEditor } from "@/components/admin/reports/PerformanceDataEditor";

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
    // Full performance data
    mtd_beginning_balance: number;
    mtd_additions: number;
    mtd_redemptions: number;
    mtd_net_income: number;
    mtd_ending_balance: number;
    mtd_rate_of_return: number;
    qtd_beginning_balance: number;
    qtd_additions: number;
    qtd_redemptions: number;
    qtd_net_income: number;
    qtd_ending_balance: number;
    qtd_rate_of_return: number;
    ytd_beginning_balance: number;
    ytd_additions: number;
    ytd_redemptions: number;
    ytd_net_income: number;
    ytd_ending_balance: number;
    ytd_rate_of_return: number;
    itd_beginning_balance: number;
    itd_additions: number;
    itd_redemptions: number;
    itd_net_income: number;
    itd_ending_balance: number;
    itd_rate_of_return: number;
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
  const [generatingReports, setGeneratingReports] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<InvestorReport | null>(null);
  const [currentPeriodId, setCurrentPeriodId] = useState<string>("");
  const { toast } = useToast();

  // Fetch real reports from database
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);

      const reportDate = `${selectedMonth}-01`;

      // Fetch all investors (profiles)
      const { data: investors, error: investorsError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("is_admin", false)
        .order("first_name");

      if (investorsError) throw investorsError;

      if (!investors || investors.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      // Fetch investor emails from investor_emails table
      const investorIds = investors.map((inv: any) => inv.id);
      const { data: investorEmailsData } = await supabase
        .from("investor_emails")
        .select("investor_id, email, is_primary, verified")
        .in("investor_id", investorIds);

      // Build email lookup, starting with profile email as fallback
      const emailsByInvestor: Record<string, any[]> = {};
      investors.forEach((inv: any) => {
        emailsByInvestor[inv.id] = [{
          email: inv.email,
          is_primary: true,
          verified: true, // Auth email is verified
        }];
      });

      // Add additional emails from investor_emails table (if any)
      if (investorEmailsData && investorEmailsData.length > 0) {
        for (const emailRecord of investorEmailsData) {
          const existing = emailsByInvestor[emailRecord.investor_id] || [];
          // Check if this email is already in the list
          if (!existing.some((e) => e.email === emailRecord.email)) {
            existing.push({
              email: emailRecord.email,
              is_primary: emailRecord.is_primary,
              verified: emailRecord.verified,
            });
          }
          emailsByInvestor[emailRecord.investor_id] = existing;
        }
      }

      // Resolve Period ID
      const [yearStr, monthStr] = selectedMonth.split("-");
      const { data: period } = await supabase
        .from("statement_periods")
        .select("id")
        .eq("year", parseInt(yearStr))
        .eq("month", parseInt(monthStr))
        .maybeSingle();

      if (!period) {
        setCurrentPeriodId("");
        // No period, return empty reports but with investor structures
        // or just empty assets
        const emptyInvestorReports = investors.map((investor) => ({
            investor_id: investor.id,
            investor_name: `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || "Unknown",
            investor_email: investor.email,
            investor_emails: emailsByInvestor[investor.id] || [],
            assets: [],
            total_value: 0,
            total_yield: 0,
            has_reports: false,
            report_count: 0
        }));
        setReports(emptyInvestorReports);
        setLoading(false);
        return;
      }

      setCurrentPeriodId(period.id);

      // Fetch monthly reports (V2)
      const { data: monthlyReports, error: reportsError } = await supabase
        .from("investor_fund_performance")
        .select("*")
        .eq("period_id", period.id)
        .order("investor_id, fund_name");

      if (reportsError) throw reportsError;

      // Group reports by investor
      const reportsByInvestor = (monthlyReports || []).reduce(
        (acc, report) => {
          const key = report.investor_id;
          if (!key) return acc;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(report);
          return acc;
        },
        {} as Record<string, typeof monthlyReports>
      );

      // Build investor report summaries
      const investorReports: InvestorReport[] = investors.map((investor) => {
        const investorPerf = reportsByInvestor[investor.id] || [];
        const hasReports = investorPerf.length > 0;

        const assets = investorPerf.map((report: any) => ({
          asset_code: report.fund_name,
          opening_balance: Number(report.mtd_beginning_balance) || 0,
          closing_balance: Number(report.mtd_ending_balance) || 0,
          additions: Number(report.mtd_additions) || 0,
          withdrawals: Number(report.mtd_redemptions) || 0,
          yield_earned: Number(report.mtd_net_income) || 0,
          report_id: report.id,
          // Full performance data
          mtd_beginning_balance: Number(report.mtd_beginning_balance) || 0,
          mtd_additions: Number(report.mtd_additions) || 0,
          mtd_redemptions: Number(report.mtd_redemptions) || 0,
          mtd_net_income: Number(report.mtd_net_income) || 0,
          mtd_ending_balance: Number(report.mtd_ending_balance) || 0,
          mtd_rate_of_return: Number(report.mtd_rate_of_return) || 0,
          qtd_beginning_balance: Number(report.qtd_beginning_balance) || 0,
          qtd_additions: Number(report.qtd_additions) || 0,
          qtd_redemptions: Number(report.qtd_redemptions) || 0,
          qtd_net_income: Number(report.qtd_net_income) || 0,
          qtd_ending_balance: Number(report.qtd_ending_balance) || 0,
          qtd_rate_of_return: Number(report.qtd_rate_of_return) || 0,
          ytd_beginning_balance: Number(report.ytd_beginning_balance) || 0,
          ytd_additions: Number(report.ytd_additions) || 0,
          ytd_redemptions: Number(report.ytd_redemptions) || 0,
          ytd_net_income: Number(report.ytd_net_income) || 0,
          ytd_ending_balance: Number(report.ytd_ending_balance) || 0,
          ytd_rate_of_return: Number(report.ytd_rate_of_return) || 0,
          itd_beginning_balance: Number(report.itd_beginning_balance) || 0,
          itd_additions: Number(report.itd_additions) || 0,
          itd_redemptions: Number(report.itd_redemptions) || 0,
          itd_net_income: Number(report.itd_net_income) || 0,
          itd_ending_balance: Number(report.itd_ending_balance) || 0,
          itd_rate_of_return: Number(report.itd_rate_of_return) || 0,
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
        const fullName = `${investor.first_name || ""} ${investor.last_name || ""}`.trim();

        return {
          investor_id: investor.id,
          investor_name: fullName || "Unknown",
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
  }, [selectedMonth, toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getFundDisplayName = (assetCode: string) => {
    // Must match FUND_ICONS keys in investor-report.ts (uppercase)
    return `${assetCode.toUpperCase()} YIELD FUND`;
  };

  // Helper to format numbers for display
  const formatValue = (val: number): string => {
    if (val === 0) return '-';
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatNetIncome = (val: number): string => {
    if (val === 0) return '-';
    const formatted = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const formatRate = (val: number): string => {
    if (val === 0) return '-';
    const pct = (val * 100).toFixed(2);
    return val >= 0 ? `+${pct}%` : `${pct}%`;
  };

  // Transform asset to InvestorFund format
  const transformToInvestorFund = (asset: InvestorReport['assets'][0]): InvestorFund => ({
    name: getFundDisplayName(asset.asset_code),
    currency: asset.asset_code.toUpperCase(),
    begin_balance_mtd: formatValue(asset.mtd_beginning_balance),
    begin_balance_qtd: formatValue(asset.qtd_beginning_balance),
    begin_balance_ytd: formatValue(asset.ytd_beginning_balance),
    begin_balance_itd: formatValue(asset.itd_beginning_balance),
    additions_mtd: formatValue(asset.mtd_additions),
    additions_qtd: formatValue(asset.qtd_additions),
    additions_ytd: formatValue(asset.ytd_additions),
    additions_itd: formatValue(asset.itd_additions),
    redemptions_mtd: formatValue(asset.mtd_redemptions),
    redemptions_qtd: formatValue(asset.qtd_redemptions),
    redemptions_ytd: formatValue(asset.ytd_redemptions),
    redemptions_itd: formatValue(asset.itd_redemptions),
    net_income_mtd: formatNetIncome(asset.mtd_net_income),
    net_income_qtd: formatNetIncome(asset.qtd_net_income),
    net_income_ytd: formatNetIncome(asset.ytd_net_income),
    net_income_itd: formatNetIncome(asset.itd_net_income),
    ending_balance_mtd: formatValue(asset.mtd_ending_balance),
    ending_balance_qtd: formatValue(asset.qtd_ending_balance),
    ending_balance_ytd: formatValue(asset.ytd_ending_balance),
    ending_balance_itd: formatValue(asset.itd_ending_balance),
    return_rate_mtd: formatRate(asset.mtd_rate_of_return),
    return_rate_qtd: formatRate(asset.qtd_rate_of_return),
    return_rate_ytd: formatRate(asset.ytd_rate_of_return),
    return_rate_itd: formatRate(asset.itd_rate_of_return),
  });

  const handlePreviewReport = (investor: InvestorReport) => {
    const investorData: InvestorData = {
      name: investor.investor_name,
      reportDate: format(parseISO(`${selectedMonth}-01`), "MMMM d, yyyy"),
      funds: investor.assets.map(transformToInvestorFund),
    };

    const html = renderReportToHtml(investorData);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  // Generate reports from transactions and positions
  const handleGenerateReports = async () => {
    setGeneratingReports(true);
    try {
      const [yearStr, monthStr] = selectedMonth.split("-");
      
      const { data, error } = await supabase.functions.invoke("generate-fund-performance", {
        body: {
          periodYear: parseInt(yearStr),
          periodMonth: parseInt(monthStr),
        },
      });

      if (error) throw error;

      toast({
        title: "Reports Generated",
        description: data.message || `Generated ${data.recordsCreated} performance records`,
      });

      // Refresh the data
      await fetchReports();
    } catch (error: any) {
      console.error("Error generating reports:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate performance data",
        variant: "destructive",
      });
    } finally {
      setGeneratingReports(false);
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
        htmlContent: string;
      }> = [];

      // Prepare batches
      for (const report of reportsToSend) {
        // Get all recipient emails (verified + primary)
        const recipientEmails = report.investor_emails
          .filter((e) => e.verified || e.is_primary) // Send to verified emails + primary email
          .map((e) => e.email);

        // Fallback to legacy email if no emails found
        if (recipientEmails.length === 0 && report.investor_email) {
          recipientEmails.push(report.investor_email);
        }

        if (recipientEmails.length === 0) continue;

        totalRecipients += recipientEmails.length;

        // Generate HTML Content using new template
        const investorData: InvestorData = {
          name: report.investor_name,
          reportDate: format(parseISO(`${selectedMonth}-01`), "MMMM d, yyyy"),
          funds: report.assets.map(transformToInvestorFund),
        };

        const htmlContent = renderReportToHtml(investorData);

        emailBatchData.push({
          investorId: report.investor_id,
          investorName: report.investor_name,
          recipientEmails,
          htmlContent,
        });
      }

      // Send emails via Edge Function (using multi-recipient format)
      let sentCount = 0;
      let failedCount = 0;
      
      for (const batch of emailBatchData) {
        // Send to all recipients in one API call
        const { error } = await supabase.functions.invoke("send-investor-report", {
          body: {
            to: batch.recipientEmails,  // Array of recipients
            investorId: batch.investorId,
            investorName: batch.investorName,
            reportMonth: selectedMonth, // YYYY-MM
            htmlContent: batch.htmlContent,
          },
        });

        if (error) {
          console.error(`Failed to send to ${batch.investorName}:`, error);
          failedCount++;
        } else {
          sentCount += batch.recipientEmails.length;
        }
      }

      toast({
        title: "Reports Sent",
        description: `Successfully sent ${sentCount} emails to investors.`,
      });
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

  // Edit performance data
  const handleEditData = (investor: InvestorReport) => {
    setEditingInvestor(investor);
    setEditorOpen(true);
  };

  // Use native token formatting from assetFormatting utility
  const formatAmount = (amount: number, assetCode: string) => {
    return formatAssetWithSymbol(amount, assetCode);
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
      <div>
        <h1 className="text-3xl font-bold">Investor Reports</h1>
        <p className="text-muted-foreground">
          View, generate, and send monthly statements to investors.
        </p>
      </div>

      <Tabs defaultValue="html-reports" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-1">
          <TabsTrigger value="html-reports" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            HTML Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="html-reports" className="mt-6 space-y-6">
          {/* HTML Reports Tab Content */}
          <div className="flex justify-end gap-2">
            <Button onClick={fetchReports} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleGenerateReports}
              disabled={generatingReports}
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              {generatingReports ? "Generating..." : "Generate Reports"}
            </Button>
            <Button
              onClick={handleSendReports}
              disabled={sendingReports || stats.reportsGenerated === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingReports ? "Sending..." : `Send Reports (${stats.reportsGenerated})`}
            </Button>
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
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.reduce((sum, r) => sum + r.assets.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Set(reports.flatMap((r) => r.assets.map((a) => a.asset_code))).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique asset types</p>
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
                      <div className="flex flex-wrap gap-2 items-center">
                        {report.assets.length > 0 ? (
                          report.assets.map((asset) => (
                            <CryptoIcon 
                              key={asset.asset_code} 
                              symbol={asset.asset_code} 
                              className="h-6 w-6" 
                            />
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
                          onClick={() => handleEditData(report)}
                          title="Edit Performance Data"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
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
                  {/* Summary - Show per-asset values in native tokens */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Positions</p>
                      <p className="text-2xl font-bold">{selectedInvestor.assets.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Asset Types</p>
                      <div className="flex flex-wrap gap-2 mt-1 items-center">
                        {selectedInvestor.assets.map((a) => (
                          <CryptoIcon key={a.asset_code} symbol={a.asset_code} className="h-6 w-6" />
                        ))}
                      </div>
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
                              {formatAmount(asset.opening_balance, asset.asset_code)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatAmount(asset.additions, asset.asset_code)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatAmount(asset.withdrawals, asset.asset_code)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatAmount(asset.yield_earned, asset.asset_code)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatAmount(asset.closing_balance, asset.asset_code)}
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

          {/* Performance Data Editor */}
          {editingInvestor && (
            <PerformanceDataEditor
              open={editorOpen}
              onOpenChange={setEditorOpen}
              investorId={editingInvestor.investor_id}
              investorName={editingInvestor.investor_name}
              periodId={currentPeriodId}
              periodName={format(parseISO(`${selectedMonth}-01`), "MMMM yyyy")}
              assets={editingInvestor.assets}
              onSaved={() => {
                fetchReports();
                setEditorOpen(false);
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestorReports;
