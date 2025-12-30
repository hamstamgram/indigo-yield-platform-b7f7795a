import { useState } from "react";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Input, Badge,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Alert, AlertDescription, AlertTitle,
} from "@/components/ui";
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
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUrlFilters } from "@/hooks";
import { format, subMonths, parseISO } from "date-fns";
import { renderReportToHtml } from "@/components/reports/InvestorReportTemplate";
import { InvestorData, InvestorFund } from "@/types/domains";
import { formatAssetWithSymbol } from "@/utils/formatters";
import { PerformanceDataEditor } from "@/components/admin/reports/PerformanceDataEditor";
import { useAdminInvestorReports, useGenerateFundPerformance } from "@/hooks/data";
import type { InvestorReportSummary, InvestorReportAsset } from "@/services";

const InvestorReports = () => {
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorReportSummary | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<InvestorReportSummary | null>(null);

  // URL-persisted filters
  const { filters, setFilter } = useUrlFilters({
    keys: ["month", "search", "status", "investorId"],
    defaults: { 
      month: format(subMonths(new Date(), 1), "yyyy-MM"),
      status: "all" 
    },
  });

  const selectedMonth = filters.month || format(subMonths(new Date(), 1), "yyyy-MM");
  const searchTerm = filters.search || "";
  const statusFilter = filters.status || "all";

  // Use React Query hook for data fetching
  const { 
    data, 
    isLoading: loading, 
    refetch 
  } = useAdminInvestorReports(selectedMonth);

  const reports = data?.reports || [];
  const currentPeriodId = data?.periodId || "";

  // Use mutation hook for generating reports
  const generateMutation = useGenerateFundPerformance();

  const getFundDisplayName = (assetCode: string) => {
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
  const transformToInvestorFund = (asset: InvestorReportAsset): InvestorFund => ({
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

  const handlePreviewReport = (investor: InvestorReportSummary) => {
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

  // Generate reports using mutation
  const handleGenerateReports = () => {
    const [yearStr, monthStr] = selectedMonth.split("-");
    generateMutation.mutate(
      { year: parseInt(yearStr), month: parseInt(monthStr) },
      { onSuccess: () => refetch() }
    );
  };

  // View report details
  const handleViewDetails = (investor: InvestorReportSummary) => {
    setSelectedInvestor(investor);
    setDetailsOpen(true);
  };

  // Edit performance data
  const handleEditData = (investor: InvestorReportSummary) => {
    setEditingInvestor(investor);
    setEditorOpen(true);
  };

  // Use native token formatting from assetFormatting utility
  const formatAmount = (amount: number, assetCode: string) => {
    return formatAssetWithSymbol(amount, assetCode);
  };

  // Filter to eligible investors (those with assets or reports)
  const eligibleReports = reports.filter((r) => r.has_reports || r.total_value > 0);

  const filteredReports = eligibleReports.filter((report) => {
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
    eligibleInvestors: eligibleReports.length,
    reportsGenerated: eligibleReports.filter((r) => r.has_reports).length,
    reportsMissing: eligibleReports.filter((r) => !r.has_reports).length,
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
          View, generate, and preview monthly statements for investors.
        </p>
      </div>

      {/* Delivery Center Banner */}
      <Alert className="bg-primary/5 border-primary/20">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Email Delivery Moved</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Report email sending has been moved to the Report Delivery Center for better tracking and reliability.
          </span>
          <Link to="/admin/reports/delivery">
            <Button size="sm" className="ml-4">
              <Send className="h-4 w-4 mr-2" />
              Go to Delivery Center
            </Button>
          </Link>
        </AlertDescription>
      </Alert>

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
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleGenerateReports}
              disabled={generateMutation.isPending}
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              {generateMutation.isPending ? "Generating..." : "Generate Reports"}
            </Button>
          </div>

          {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.eligibleInvestors}</div>
            <p className="text-xs text-muted-foreground">Of {stats.totalInvestors} total</p>
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
        <Select value={selectedMonth} onValueChange={(v) => setFilter("month", v)}>
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

        <Select value={statusFilter} onValueChange={(v) => setFilter("status", v)}>
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
            onChange={(e) => setFilter("search", e.target.value || null)}
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
                refetch();
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
