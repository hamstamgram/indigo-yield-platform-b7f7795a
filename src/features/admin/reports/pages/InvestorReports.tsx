/**
 * Investor Reports Page (Statement Manager)
 * Redesigned with clear workflow: Select Period > Review > Send
 *
 * Key improvements over v1:
 * - Combined month/year selector (single dropdown)
 * - Status summary cards with counts
 * - Checkbox multi-select for bulk operations
 * - Per-row dropdown actions (replacing 5 icon buttons)
 * - Proper confirmation dialogs (no window.confirm)
 * - Send progress indicator with failure tracking
 * - Super admin gates on destructive operations
 * - Debounced search (fixes URL-debounce bug)
 * - "Regenerate All" hidden behind overflow menu
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  Card,
  CardContent,
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
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  QueryErrorBoundary,
} from "@/components/ui";
import {
  FileText,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUrlFilters, useDebounce } from "@/hooks/ui";
import { format, subMonths, parseISO } from "date-fns";
import {
  useAdminInvestorReports,
  useGenerateFundPerformance,
  useSendReportEmail,
  useDeleteInvestorReport,
} from "@/hooks/data";
import type { InvestorReportSummary } from "@/services/admin/reportQueryService";
import { sanitizeHtml } from "@/utils/sanitize";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { useSuperAdmin } from "@/components/admin";
import {
  SendConfirmDialog,
  SendProgressDialog,
  DeleteConfirmDialog,
  RegenerateAllDialog,
  ReportRowActions,
  ReportBulkActionToolbar,
} from "../components";
import type { SendProgress } from "../components";

// -- Helpers ------------------------------------------------------------------

function getStatusBadge(status: string) {
  switch (status) {
    case "sent":
      return <Badge className="bg-green-600 text-white">Sent</Badge>;
    case "generated":
      return <Badge variant="default">Ready</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "missing":
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

function getMonthLabel(monthStr: string): string {
  return format(parseISO(`${monthStr}-01`), "MMMM yyyy");
}

/** Build combined month options for the dropdown (last 24 months) */
function buildMonthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let i = 1; i <= 24; i++) {
    const d = subMonths(now, i);
    const value = format(d, "yyyy-MM");
    const label = format(d, "MMMM yyyy");
    options.push({ value, label });
  }
  return options;
}

const MONTH_OPTIONS = buildMonthOptions();

const SEND_DELAY_MS = 200;

// -- Component ----------------------------------------------------------------

const InvestorReports = ({ embedded = false }: { embedded?: boolean }) => {
  // -- State ------------------------------------------------------------------
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localSearch, setLocalSearch] = useState("");

  // Dialog state
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [sendConfirmRecipients, setSendConfirmRecipients] = useState<InvestorReportSummary[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<InvestorReportSummary | null>(null);
  const [regenerateAllOpen, setRegenerateAllOpen] = useState(false);
  const [sendProgressOpen, setSendProgressOpen] = useState(false);
  const [sendProgress, setSendProgress] = useState<SendProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    current: "",
    failures: [],
    isComplete: false,
  });

  // Abort ref for bulk send
  const abortRef = useRef(false);

  // -- Super admin check ------------------------------------------------------
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();

  // -- URL-persisted filters --------------------------------------------------
  const { filters, setFilter } = useUrlFilters({
    keys: ["month", "search", "status"],
    defaults: {
      month: format(subMonths(new Date(), 1), "yyyy-MM"),
      status: "all",
    },
  });

  const selectedMonth = filters.month || format(subMonths(new Date(), 1), "yyyy-MM");
  const statusFilter = filters.status || "all";

  // Debounced search: local state for input, debounced value for filtering
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync URL filter with debounced value (one-way: debounced -> URL)
  // We use the debounced value for actual filtering to prevent URL thrashing
  const searchTerm = debouncedSearch;

  // -- Data -------------------------------------------------------------------
  const { data, isLoading, refetch } = useAdminInvestorReports(selectedMonth);
  const reports = data?.reports || [];
  const periodId = data?.periodId || "";

  const generateMutation = useGenerateFundPerformance();
  const sendMutation = useSendReportEmail();
  const deleteMutation = useDeleteInvestorReport();

  // -- Filtering --------------------------------------------------------------
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        !searchTerm ||
        report.investor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.investor_email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || report.delivery_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, searchTerm, statusFilter]);

  // -- Stats ------------------------------------------------------------------
  const stats = useMemo(() => {
    const generated = reports.filter(
      (r) => r.delivery_status === "generated" || r.delivery_status === "sent"
    ).length;
    const sent = reports.filter((r) => r.delivery_status === "sent").length;
    const ready = reports.filter((r) => r.delivery_status === "generated").length;
    const missing = reports.filter((r) => r.delivery_status === "missing").length;
    const failed = reports.filter((r) => r.delivery_status === "failed").length;
    return { total: reports.length, generated, sent, ready, missing, failed };
  }, [reports]);

  // -- Selection --------------------------------------------------------------
  const selectableIds = useMemo(
    () => new Set(filteredReports.map((r) => r.investor_id)),
    [filteredReports]
  );

  const validSelectedIds = useMemo(() => {
    const valid = new Set<string>();
    for (const id of selectedIds) {
      if (selectableIds.has(id)) valid.add(id);
    }
    return valid;
  }, [selectedIds, selectableIds]);

  const isAllSelected =
    filteredReports.length > 0 && filteredReports.every((r) => validSelectedIds.has(r.investor_id));

  const isIndeterminate = validSelectedIds.size > 0 && !isAllSelected;

  const selectedReports = useMemo(
    () => filteredReports.filter((r) => validSelectedIds.has(r.investor_id)),
    [filteredReports, validSelectedIds]
  );

  const sendableSelected = useMemo(
    () =>
      selectedReports.filter(
        (r) =>
          (r.delivery_status === "generated" || r.delivery_status === "failed") &&
          (r.has_reports || r.statement_id)
      ),
    [selectedReports]
  );

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected =
        filteredReports.length > 0 && filteredReports.every((r) => prev.has(r.investor_id));
      if (allSelected) return new Set();
      return new Set(filteredReports.map((r) => r.investor_id));
    });
  }, [filteredReports]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // -- Handlers ---------------------------------------------------------------

  const handleGenerate = useCallback(() => {
    const [yearStr, monthStr] = selectedMonth.split("-");
    generateMutation.mutate(
      { year: parseInt(yearStr), month: parseInt(monthStr) },
      { onSuccess: () => refetch() }
    );
  }, [selectedMonth, generateMutation, refetch]);

  const handleRegenerate = useCallback(
    async (report: InvestorReportSummary) => {
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
    },
    [selectedMonth, generateMutation, refetch]
  );

  const handleDeleteRequest = useCallback(
    (report: InvestorReportSummary) => {
      if (!isSuperAdmin) {
        toast.error("Super Admin privileges required to delete reports");
        return;
      }
      setDeleteTarget(report);
    },
    [isSuperAdmin]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || !periodId) return;
    setDeletingId(deleteTarget.investor_id);
    setDeleteTarget(null);
    try {
      await deleteMutation.mutateAsync({
        investorId: deleteTarget.investor_id,
        periodId,
      });
      refetch();
    } finally {
      setDeletingId(null);
    }
  }, [deleteTarget, periodId, deleteMutation, refetch]);

  const handleRegenerateAllRequest = useCallback(() => {
    if (!isSuperAdmin) {
      toast.error("Super Admin privileges required to regenerate all reports");
      return;
    }
    setRegenerateAllOpen(true);
  }, [isSuperAdmin]);

  const handleRegenerateAllConfirm = useCallback(() => {
    setRegenerateAllOpen(false);
    handleGenerate();
  }, [handleGenerate]);

  const handlePreview = useCallback(async (report: InvestorReportSummary) => {
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
  }, []);

  const handleSendSingle = useCallback(
    async (report: InvestorReportSummary) => {
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
    },
    [periodId, sendMutation, refetch]
  );

  // Open send confirmation for selected reports
  const handleSendSelectedRequest = useCallback(() => {
    if (sendableSelected.length === 0) {
      toast.info("No sendable reports selected");
      return;
    }
    setSendConfirmRecipients(sendableSelected);
    setSendConfirmOpen(true);
  }, [sendableSelected]);

  // Open send confirmation for all unsent reports
  const handleSendAllUnsentRequest = useCallback(() => {
    if (!isSuperAdmin) {
      toast.error("Super Admin privileges required for bulk send");
      return;
    }
    const unsent = reports.filter(
      (r) =>
        (r.delivery_status === "generated" || r.delivery_status === "failed") &&
        (r.has_reports || r.statement_id)
    );
    if (unsent.length === 0) {
      toast.info("No unsent reports to deliver");
      return;
    }
    setSendConfirmRecipients(unsent);
    setSendConfirmOpen(true);
  }, [isSuperAdmin, reports]);

  // Execute bulk send with progress tracking and rate-limit delay
  const executeBulkSend = useCallback(
    async (recipients: InvestorReportSummary[]) => {
      if (!periodId) return;

      abortRef.current = false;
      setSendConfirmOpen(false);
      setSendProgress({
        total: recipients.length,
        sent: 0,
        failed: 0,
        current: recipients[0]?.investor_name || "",
        failures: [],
        isComplete: false,
      });
      setSendProgressOpen(true);

      let sent = 0;
      let failed = 0;
      const failures: Array<{ name: string; error: string }> = [];

      for (let i = 0; i < recipients.length; i++) {
        if (abortRef.current) break;

        const report = recipients[i];
        setSendProgress((prev) => ({
          ...prev,
          current: report.investor_name,
        }));

        try {
          await sendMutation.mutateAsync({
            investorId: report.investor_id,
            periodId,
          });
          sent++;
        } catch (err) {
          failed++;
          failures.push({
            name: report.investor_name,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }

        setSendProgress({
          total: recipients.length,
          sent,
          failed,
          current: report.investor_name,
          failures: [...failures],
          isComplete: false,
        });

        // Rate-limit delay between sends (skip after last)
        if (i < recipients.length - 1 && !abortRef.current) {
          await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
        }
      }

      setSendProgress((prev) => ({ ...prev, isComplete: true }));
      clearSelection();
      refetch();
    },
    [periodId, sendMutation, refetch, clearSelection]
  );

  // -- Loading state ----------------------------------------------------------
  if (isLoading) {
    const loadingSkeleton = (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
        <div className="h-96 bg-muted rounded" />
      </div>
    );
    if (embedded) return loadingSkeleton;
    return <PageShell>{loadingSkeleton}</PageShell>;
  }

  // -- Render -----------------------------------------------------------------
  const monthLabel = getMonthLabel(selectedMonth);

  const content = (
    <div className="space-y-6">
      {/* Header + Period Selector + Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {!embedded && (
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monthly Statements</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate, review, and deliver investor reports
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Combined month/year selector */}
          <Select
            value={selectedMonth}
            onValueChange={(v) => {
              setFilter("month", v);
              clearSelection();
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Generate Statements */}
          <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {generateMutation.isPending ? "Generating..." : "Generate Statements"}
          </Button>

          {/* Overflow menu for dangerous actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleSendAllUnsentRequest}
                disabled={!periodId || superAdminLoading}
              >
                <Send className="h-4 w-4 mr-2" />
                Send All Unsent
                {!isSuperAdmin && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    Super Admin
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleRegenerateAllRequest}
                disabled={generateMutation.isPending || superAdminLoading}
                className="text-amber-500 focus:text-amber-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate All
                {!isSuperAdmin && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    Super Admin
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Total</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">investors</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Sent</span>
            <CheckCircle2 className="h-4 w-4 text-yield" />
          </div>
          <div className="text-2xl font-bold text-yield">{stats.sent}</div>
          <p className="text-xs text-muted-foreground">delivered</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Ready</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-500">{stats.ready}</div>
          <p className="text-xs text-muted-foreground">
            {stats.failed > 0 ? `+ ${stats.failed} failed` : "to send"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Pending</span>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-yellow-500">{stats.missing}</div>
          <p className="text-xs text-muted-foreground">need generation</p>
        </Card>
      </div>

      {/* Bulk action toolbar (shows when items selected) */}
      <ReportBulkActionToolbar
        selectedCount={validSelectedIds.size}
        sendableCount={sendableSelected.length}
        onSendSelected={handleSendSelectedRequest}
        onClear={clearSelection}
      />

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search investors..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setFilter("status", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="generated">Ready</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="missing">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : 'Click "Generate Statements" to create reports'}
              </p>
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      checked={isAllSelected ? true : isIndeterminate ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Investor</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Assets</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Sent</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow
                    key={report.investor_id}
                    className={validSelectedIds.has(report.investor_id) ? "bg-muted/50" : undefined}
                  >
                    <TableCell className="pl-4 py-1.5">
                      <Checkbox
                        checked={validSelectedIds.has(report.investor_id)}
                        onCheckedChange={() => toggleOne(report.investor_id)}
                      />
                    </TableCell>
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
                      {getStatusBadge(report.delivery_status)}
                    </TableCell>
                    <TableCell className="py-1.5 text-muted-foreground">
                      {report.sent_at ? format(new Date(report.sent_at), "MMM d, HH:mm") : "--"}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <ReportRowActions
                        report={report}
                        isSuperAdmin={isSuperAdmin}
                        sendingId={sendingId}
                        regeneratingId={regeneratingId}
                        deletingId={deletingId}
                        onPreview={handlePreview}
                        onSend={handleSendSingle}
                        onRegenerate={handleRegenerate}
                        onDelete={handleDeleteRequest}
                      />
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
              {previewName} - {monthLabel}
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

      {/* Send Confirmation Dialog */}
      <SendConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        recipients={sendConfirmRecipients}
        monthLabel={monthLabel}
        onConfirm={() => executeBulkSend(sendConfirmRecipients)}
      />

      {/* Send Progress Dialog */}
      <SendProgressDialog
        open={sendProgressOpen}
        onOpenChange={setSendProgressOpen}
        progress={sendProgress}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        investorName={deleteTarget?.investor_name || ""}
        onConfirm={handleDeleteConfirm}
      />

      {/* Regenerate All Confirmation Dialog */}
      <RegenerateAllDialog
        open={regenerateAllOpen}
        onOpenChange={setRegenerateAllOpen}
        monthLabel={monthLabel}
        reportCount={stats.total}
        onConfirm={handleRegenerateAllConfirm}
      />
    </div>
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
