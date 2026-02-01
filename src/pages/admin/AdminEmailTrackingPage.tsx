/**
 * Admin Email Tracking Page
 * Track and monitor all emails sent to investors
 *
 * Uses statement_email_delivery table as the primary data source
 *
 * Features:
 * - View email logs with detailed information
 * - Filter by status, date range
 * - Search by recipient or subject
 * - Export logs to CSV
 * - View email details
 * - Statistics dashboard
 */

import { useState } from "react";
import {
  useEmailStats,
  useEmailDeliveries,
  type EmailFilters,
  type EmailDelivery,
} from "@/hooks/data";
import { getTodayString } from "@/utils/dateUtils";
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  BarChart3,
  AlertCircle,
  MousePointerClick,
} from "lucide-react";
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SortableTableHead,
} from "@/components/ui";
import { useSortableColumns } from "@/hooks";

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface EmailPreviewDialog {
  open: boolean;
  delivery: EmailDelivery | null;
}

// =====================================================
// ADMIN EMAIL TRACKING PAGE COMPONENT
// =====================================================

export default function AdminEmailTrackingPage() {
  const [filters, setFilters] = useState<EmailFilters>({
    search: "",
    status: "all",
  });

  const [previewDialog, setPreviewDialog] = useState<EmailPreviewDialog>({
    open: false,
    delivery: null,
  });

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const { data: stats } = useEmailStats(filters); // Pass same filters for consistent stats
  const { data: emailDeliveries, isLoading: logsLoading } = useEmailDeliveries(filters);

  const { sortConfig, requestSort, sortedData } = useSortableColumns(emailDeliveries || [], {
    column: "created_at",
    direction: "desc",
  });

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleExportCSV = () => {
    if (!sortedData || sortedData.length === 0) return;

    // Create CSV content
    const headers = [
      "Date",
      "Recipient",
      "Subject",
      "Status",
      "Delivered At",
      "Opened At",
      "Error",
    ];
    const rows = sortedData.map((d) => [
      new Date(d.created_at).toLocaleString(),
      d.recipient_email,
      d.subject,
      d.status,
      d.delivered_at ? new Date(d.delivered_at).toLocaleString() : "",
      d.opened_at ? new Date(d.opened_at).toLocaleString() : "",
      d.error_message || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-deliveries-${getTodayString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePreview = (delivery: EmailDelivery) => {
    setPreviewDialog({ open: true, delivery });
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      PENDING: { variant: "secondary", icon: Send, label: "Pending" },
      SENT: { variant: "secondary", icon: Send, label: "Sent" },
      DELIVERED: { variant: "default", icon: CheckCircle2, label: "Delivered" },
      OPENED: { variant: "default", icon: Eye, label: "Opened" },
      CLICKED: { variant: "default", icon: MousePointerClick, label: "Clicked" },
      FAILED: { variant: "destructive", icon: XCircle, label: "Failed" },
      BOUNCED: { variant: "destructive", icon: AlertCircle, label: "Bounced" },
    };

    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and track all emails sent to investors
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={!sortedData || sortedData.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.delivered || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opened</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.opened || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.successRate || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats?.todayCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient or subject..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filters.status}
            onValueChange={(value: any) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="OPENED">Opened</SelectItem>
              <SelectItem value="CLICKED">Clicked</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="BOUNCED">Bounced</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Deliveries ({sortedData?.length || 0})</CardTitle>
          <CardDescription>View all emails sent from the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <BarChart3 className="h-6 w-6 animate-pulse text-muted-foreground" />
            </div>
          ) : sortedData && sortedData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    column="created_at"
                    currentSort={sortConfig}
                    onSort={requestSort}
                  >
                    Date
                  </SortableTableHead>
                  <SortableTableHead
                    column="recipient_email"
                    currentSort={sortConfig}
                    onSort={requestSort}
                  >
                    Recipient
                  </SortableTableHead>
                  <SortableTableHead column="subject" currentSort={sortConfig} onSort={requestSort}>
                    Subject
                  </SortableTableHead>
                  <SortableTableHead column="status" currentSort={sortConfig} onSort={requestSort}>
                    Status
                  </SortableTableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(delivery.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{delivery.recipient_email}</span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{delivery.subject}</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(delivery.delivered_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(delivery.opened_at)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handlePreview(delivery)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No email deliveries found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onOpenChange={(open) => setPreviewDialog({ open, delivery: null })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>{previewDialog.delivery?.subject}</DialogDescription>
          </DialogHeader>
          {previewDialog.delivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recipient</p>
                  <p>{previewDialog.delivery.recipient_email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {getStatusBadge(previewDialog.delivery.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p>{formatDate(previewDialog.delivery.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sent</p>
                  <p>{formatDate(previewDialog.delivery.sent_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                  <p>{formatDate(previewDialog.delivery.delivered_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Opened</p>
                  <p>{formatDate(previewDialog.delivery.opened_at)}</p>
                </div>
              </div>

              {previewDialog.delivery.error_message && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/80">
                    {previewDialog.delivery.error_message}
                  </p>
                  {previewDialog.delivery.error_code && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Code: {previewDialog.delivery.error_code}
                    </p>
                  )}
                </div>
              )}

              {previewDialog.delivery.bounce_type && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm font-medium text-amber-600">Bounce Type</p>
                  <p className="text-sm">{previewDialog.delivery.bounce_type}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
