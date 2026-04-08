import { useState, useMemo } from "react";
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
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from "@/components/ui";
import { Database, Search, ChevronLeft, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { CryptoIcon } from "@/components/CryptoIcons";
import { useHistoricalReports, useBulkDeleteReports, useDeleteSingleReport } from "@/features/admin/reports/hooks/useReports";
import { useSuperAdmin } from "@/features/admin/shared/SuperAdminGuard";
import { format, subMonths } from "date-fns";
import type { DeliveryStatus } from "@/features/admin/reports/services/reportQueryService";
import { useReportSelection } from "./hooks/useReportSelection";
import type { HistoricalReport } from "./hooks/useReportSelection";
import { ReportBulkActionToolbar } from "./components/ReportBulkActionToolbar";
import { BulkDeleteReportsDialog } from "./components/BulkDeleteReportsDialog";

function getStatusBadge(status: DeliveryStatus) {
  switch (status) {
    case "sent":
      return <Badge className="bg-green-600">Sent</Badge>;
    case "generated":
      return <Badge variant="default">Generated</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function getAssetFromFundName(fundName: string): string {
  const match = fundName.match(/^(\w+)\s/);
  return match ? match[1] : fundName;
}

const HistoricalReportsDashboard: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [monthFilter, setMonthFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const pageSize = 20;

  const { data, isLoading } = useHistoricalReports({
    month: monthFilter || undefined,
    page,
    pageSize,
  });

  const { isSuperAdmin } = useSuperAdmin();
  const bulkDeleteMutation = useBulkDeleteReports();
  const deleteSingleMutation = useDeleteSingleReport();

  const reports = data?.reports || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredReports: HistoricalReport[] = useMemo(() => {
    const base = searchTerm
      ? reports.filter((r: HistoricalReport) =>
          r.investor_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : reports;
    return base;
  }, [reports, searchTerm]);

  const selection = useReportSelection(filteredReports, page);

  const selectedReports = useMemo(
    () => filteredReports.filter((r) => selection.selectedIds.has(r.id)),
    [filteredReports, selection.selectedIds]
  );

  return (
    <div className={embedded ? "space-y-6" : "container mx-auto px-4 py-8 space-y-6"}>
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold">Report History</h1>
          <p className="text-muted-foreground">All generated statements across all periods</p>
        </div>
      )}

      {/* Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">Across all periods</p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select
          value={monthFilter}
          onValueChange={(v) => {
            setMonthFilter(v === "all" ? "" : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
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

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search investor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      <ReportBulkActionToolbar
        summary={selection.summary}
        isSuperAdmin={isSuperAdmin}
        onDelete={() => setBulkDeleteDialogOpen(true)}
        onClear={selection.clearSelection}
      />

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No reports found</div>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] px-2">
                    <Checkbox
                      checked={
                        selection.isAllSelected
                          ? true
                          : selection.isIndeterminate
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={selection.toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Period</TableHead>
                  <TableHead className="whitespace-nowrap">Investor</TableHead>
                  <TableHead className="whitespace-nowrap">Assets</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="px-2 py-1.5">
                      <Checkbox
                        checked={selection.isSelected(report.id)}
                        onCheckedChange={() => selection.toggleOne(report.id)}
                        aria-label={`Select report ${report.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono py-1.5">{report.period_month}</TableCell>
                    <TableCell className="py-1.5 truncate max-w-[130px]">
                      <Link
                        to={`/admin/investors/${report.investor_id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {report.investor_name}
                      </Link>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex gap-1 items-center">
                        {report.fund_names.map((name) => {
                          const asset = getAssetFromFundName(name);
                          return <CryptoIcon key={name} symbol={asset} className="h-4 w-4" />;
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(report.delivery_status as DeliveryStatus)}
                        {report.sent_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(report.sent_at), "MMM d")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSingleMutation.mutate(report.id)}
                        disabled={deleteSingleMutation.isPending}
                        aria-label="Delete report"
                      >
                        {deleteSingleMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Dialog */}
      <BulkDeleteReportsDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        reports={selectedReports}
        summary={selection.summary}
        isPending={bulkDeleteMutation.isPending}
        onConfirm={() => {
          bulkDeleteMutation.mutate(Array.from(selection.selectedIds), {
            onSuccess: () => {
              setBulkDeleteDialogOpen(false);
              selection.clearSelection();
            },
          });
        }}
      />
    </div>
  );
};

export default HistoricalReportsDashboard;
