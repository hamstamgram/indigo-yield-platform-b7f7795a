import { useState } from "react";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import {
  FileText,
  Send,
  Calendar,
  RefreshCw,
  Search,
  CheckCircle2,
  Users,
  Eye,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUrlFilters } from "@/hooks";
import { format, subMonths, parseISO } from "date-fns";
import {
  useAdminInvestorReports,
  useGenerateFundPerformance,
  useSendReportEmail,
  useDeleteInvestorReport,
} from "@/hooks/data";
import type { InvestorReportSummary, DeliveryStatus } from "@/services/admin/reportQueryService";
import { sanitizeHtml } from "@/utils/sanitize";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QueryErrorBoundary } from "@/components/ui";
import { PageShell } from "@/components/layout/PageShell";

function getStatusBadge(status: DeliveryStatus) {
  switch (status) {
    case "sent":
      return <Badge className="bg-green-600">Sent</Badge>;
    case "generated":
      return <Badge variant="default">Generated</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "missing":
    default:
      return <Badge variant="outline">Missing</Badge>;
  }
}

function getMonthLabel(monthStr: string): string {
  return format(parseISO(`${monthStr}-01`), "MMMM yyyy");
}

const InvestorReports = ({ embedded = false }: { embedded?: boolean }) => {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  // URL-persisted filters
  const { filters, setFilter } = useUrlFilters({
    keys: ["month", "search", "status"],
    defaults: {
      month: format(subMonths(new Date(), 1), "yyyy-MM"),
      status: "all",
    },
  });

  const selectedMonth = filters.month || format(subMonths(new Date(), 1), "yyyy-MM");
  const searchTerm = filters.search || "";
  const statusFilter = filters.status || "all";

  const { data, isLoading, refetch } = useAdminInvestorReports(selectedMonth);
  const reports = data?.reports || [];
  const periodId = data?.periodId || "";

  const generateMutation = useGenerateFundPerformance();
  const sendMutation = useSendReportEmail();
  const deleteMutation = useDeleteInvestorReport();

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.investor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.investor_email.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter !== "all") {
      matchesStatus = report.delivery_status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Stats
  const generatedCount = reports.filter(
    (r) => r.delivery_status === "generated" || r.delivery_status === "sent"
  ).length;
  const missingCount = reports.filter((r) => r.delivery_status === "missing").length;
  const sentCount = reports.filter((r) => r.delivery_status === "sent").length;

  const handleGenerate = () => {
    const [yearStr, monthStr] = selectedMonth.split("-");
    generateMutation.mutate(
      { year: parseInt(yearStr), month: parseInt(monthStr) },
      { onSuccess: () => refetch() }
    );
  };

  const handleRegenerate = async (report: InvestorReportSummary) => {
    const [yearStr, monthStr] = selectedMonth.split("-");
    setRegeneratingId(report.investor_id);
    try {
      await generateMutation.mutateAsync({
        year: parseInt(yearStr),
        month: parseInt(monthStr),
        investorId: report.investor_id,
      });
      refetch();
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDelete = async (report: InvestorReportSummary) => {
    if (!periodId) return;
    if (!confirm(`Are you sure you want to delete reports for ${report.investor_name}?`)) return;

    setDeletingId(report.investor_id);
    try {
      await deleteMutation.mutateAsync({
        investorId: report.investor_id,
        periodId,
      });
      refetch();
    } finally {
      setDeletingId(null);
    }
  };

  const handleRegenerateAll = async () => {
    if (!confirm("This will clear and recalculate ALL reports for this month. Proceed?")) return;
    handleGenerate();
  };

  const handlePreview = async (report: InvestorReportSummary) => {
    if (!report.statement_id) {
      toast.error("No statement generated yet for this investor");
      return;
    }

    const { data: stmt, error } = await supabase
      .from("generated_statements")
      .select("html_content")
      .eq("id", report.statement_id)
      .single();

    if (error || !stmt?.html_content) {
      toast.error("Failed to load statement preview");
      return;
    }

    setPreviewName(report.investor_name);
    setPreviewHtml(stmt.html_content);
  };

  const handleSend = async (report: InvestorReportSummary) => {
    if (!periodId) return;
    setSendingId(report.investor_id);
    try {
      await sendMutation.mutateAsync({
        investorId: report.investor_id,
        periodId,
      });
      refetch();
    } finally {
      setSendingId(null);
    }
  };

  const handleSendAll = async () => {
    if (!periodId) return;
    const toSend = reports.filter(
      (r) => r.delivery_status === "generated" && (r.has_reports || r.statement_id)
    );
    if (toSend.length === 0) {
      toast.info("No unsent reports to deliver");
      return;
    }

    setSendingAll(true);
    let sent = 0;
    let failed = 0;

    for (const report of toSend) {
      try {
        await sendMutation.mutateAsync({
          investorId: report.investor_id,
          periodId,
        });
        sent++;
      } catch {
        failed++;
      }
    }

    setSendingAll(false);
    refetch();
    toast.success(`Sent ${sent} reports${failed > 0 ? `, ${failed} failed` : ""}`);
  };

  if (isLoading) {
    const loadingSkeleton = (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
        <div className="h-96 bg-muted rounded" />
      </div>
    );
    if (embedded) return loadingSkeleton;
    return <PageShell>{loadingSkeleton}</PageShell>;
  }

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold">Statement Manager</h1>
            <p className="text-muted-foreground">
              Generate, preview, and deliver monthly statements
            </p>
          </div>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Select
            value={selectedMonth.split("-")[0]}
            onValueChange={(year) => {
              const month = selectedMonth.split("-")[1];
              setFilter("month", `${year}-${month}`);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: new Date().getFullYear() - 2024 + 1 }, (_, i) => {
                const year = String(2024 + i);
                return (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select
            value={selectedMonth.split("-")[1]}
            onValueChange={(month) => {
              const year = selectedMonth.split("-")[0];
              setFilter("month", `${year}-${month}`);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const monthValue = String(i + 1).padStart(2, "0");
                const label = format(new Date(2024, i), "MMMM");
                return (
                  <SelectItem key={monthValue} value={monthValue}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generated</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{generatedCount}</div>
            <p className="text-xs text-muted-foreground">
              {sentCount} sent, {generatedCount - sentCount} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{missingCount}</div>
            <p className="text-xs text-muted-foreground">Need generation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">{getMonthLabel(selectedMonth)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleGenerate} disabled={generateMutation.isPending} variant="outline">
          {generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          {generateMutation.isPending ? "Generating..." : "Generate Missing"}
        </Button>
        <Button
          onClick={handleRegenerateAll}
          disabled={generateMutation.isPending}
          variant="outline"
          className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Regenerate All
        </Button>
        <Button onClick={handleSendAll} disabled={sendingAll || !periodId} variant="outline">
          {sendingAll ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {sendingAll ? "Sending..." : "Send All Generated"}
        </Button>
        <Button onClick={() => refetch()} variant="ghost" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search investors..."
            value={searchTerm}
            onChange={(e) => setFilter("search", e.target.value || null)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setFilter("status", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="generated">Generated</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Reports - {getMonthLabel(selectedMonth)}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : 'Click "Generate All Missing" to create reports'}
              </p>
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Investor</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Assets</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.investor_id}>
                    <TableCell className="font-medium py-1.5 truncate max-w-[130px]">
                      <Link
                        to={`/admin/investors/${report.investor_id}`}
                        className="text-primary hover:underline"
                      >
                        {report.investor_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-1.5 truncate max-w-[150px]">
                      {report.investor_email}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex gap-1 items-center">
                        {report.assets.length > 0 ? (
                          report.assets.map((asset) => (
                            <CryptoIcon
                              key={asset.asset_code}
                              symbol={asset.asset_code}
                              className="h-4 w-4"
                            />
                          ))
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(report.delivery_status)}
                        {report.sent_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(report.sent_at), "MMM d, HH:mm")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(report)}
                          disabled={!report.statement_id && !report.has_reports}
                          title="Preview HTML"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {report.delivery_status !== "sent" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSend(report)}
                            disabled={
                              sendingId === report.investor_id ||
                              report.delivery_status === "missing" ||
                              !periodId
                            }
                            title="Send Email"
                          >
                            {sendingId === report.investor_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRegenerate(report)}
                          disabled={
                            regeneratingId === report.investor_id || generateMutation.isPending
                          }
                          title="Regenerate Report"
                        >
                          {regeneratingId === report.investor_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(report)}
                          disabled={deletingId === report.investor_id || !report.has_reports}
                          title="Delete Report"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          {deletingId === report.investor_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                        {report.delivery_status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSend(report)}
                            disabled={sendingId === report.investor_id}
                            title="Retry"
                          >
                            <AlertCircle className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewName} - Monthly Report - {getMonthLabel(selectedMonth)}
            </DialogTitle>
          </DialogHeader>
          {previewHtml && (
            <iframe
              srcDoc={sanitizeHtml(previewHtml)}
              className="w-full h-[70vh] border rounded"
              title="Statement Preview"
              sandbox="allow-same-origin"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) return content;
  return <PageShell>{content}</PageShell>;
};

function InvestorReportsWithErrorBoundary({ embedded = false }: { embedded?: boolean }) {
  return (
    <QueryErrorBoundary>
      <InvestorReports embedded={embedded} />
    </QueryErrorBoundary>
  );
}

export default InvestorReportsWithErrorBoundary;
