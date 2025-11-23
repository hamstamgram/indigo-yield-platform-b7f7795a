/**
 * Admin Email Tracking Page
 * Track and monitor all emails sent to investors
 *
 * Features:
 * - View email logs with detailed information
 * - Filter by email type, status, date range
 * - Search by recipient or subject
 * - Export logs to CSV
 * - View email content preview
 * - Statistics dashboard
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  email_type: string | null;
  report_month: string | null;
  sent_by: string | null;
  sent_at: string;
  status: string;
  external_id: string | null;
  error_message: string | null;
  created_at: string;
}

interface EmailFilters {
  search: string;
  emailType:
    | "all"
    | "investor_report"
    | "onboarding_welcome"
    | "password_reset"
    | "withdrawal_confirmation";
  status: "all" | "sent" | "delivered" | "failed" | "bounced";
  dateFrom?: string;
  dateTo?: string;
}

interface EmailStats {
  totalSent: number;
  delivered: number;
  failed: number;
  bounced: number;
  successRate: number;
  todayCount: number;
}

interface EmailPreviewDialog {
  open: boolean;
  emailLog: EmailLog | null;
}

// =====================================================
// ADMIN EMAIL TRACKING PAGE COMPONENT
// =====================================================

export default function AdminEmailTrackingPage() {
  const [filters, setFilters] = useState<EmailFilters>({
    search: "",
    emailType: "all",
    status: "all",
  });

  const [previewDialog, setPreviewDialog] = useState<EmailPreviewDialog>({
    open: false,
    emailLog: null,
  });

  // =====================================================
  // DATA FETCHING
  // =====================================================

  // Fetch email statistics
  // TODO: Create email_logs table in database when email tracking feature is activated
  const { data: stats, isLoading: statsLoading } = useQuery<EmailStats>({
    queryKey: ["email-stats"],
    queryFn: async () => {
      // Stubbed - email_logs table doesn't exist yet
      const data: any[] = [];
      // const { data, error } = await supabase.from("email_logs").select("status, sent_at");
      // if (error) throw error;

      const today = new Date().toISOString().split("T")[0];

      const stats: EmailStats = {
        totalSent: data?.length || 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        successRate: 0,
        todayCount: 0,
      };

      data?.forEach((log) => {
        if (log.status === "sent" || log.status === "delivered") stats.delivered++;
        if (log.status === "failed") stats.failed++;
        if (log.status === "bounced") stats.bounced++;
        if (log.sent_at.startsWith(today)) stats.todayCount++;
      });

      stats.successRate =
        stats.totalSent > 0 ? Math.round((stats.delivered / stats.totalSent) * 100) : 0;

      return stats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch email logs
  // TODO: Enable when email_logs table is created
  const { data: emailLogs, isLoading: logsLoading } = useQuery<EmailLog[]>({
    queryKey: ["email-logs", filters],
    queryFn: async () => {
      // Stubbed - email_logs table doesn't exist yet
      return [];

      /* Original code - restore when email_logs table is created:
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(100);

      // Apply filters
      if (filters.emailType !== "all") {
        query = query.eq("email_type", filters.emailType);
      }

      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.search) {
        query = query.or(
          `recipient_email.ilike.%${filters.search}%,recipient_name.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`
        );
      }

      if (filters.dateFrom) {
        query = query.gte("sent_at", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("sent_at", filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
      */
    },
  });

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleExportCSV = () => {
    if (!emailLogs || emailLogs.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Recipient", "Subject", "Type", "Status", "Error"];
    const rows = emailLogs.map((log) => [
      new Date(log.sent_at).toLocaleString(),
      log.recipient_email,
      log.subject,
      log.email_type || "N/A",
      log.status,
      log.error_message || "",
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
    a.download = `email-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePreview = (emailLog: EmailLog) => {
    setPreviewDialog({ open: true, emailLog });
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      sent: { variant: "secondary", icon: Send, label: "Sent" },
      delivered: { variant: "default", icon: CheckCircle2, label: "Delivered" },
      failed: { variant: "destructive", icon: XCircle, label: "Failed" },
      bounced: { variant: "destructive", icon: AlertCircle, label: "Bounced" },
    };

    const config = variants[status] || variants.sent;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEmailTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      investor_report: "Investor Report",
      onboarding_welcome: "Welcome Email",
      password_reset: "Password Reset",
      withdrawal_confirmation: "Withdrawal",
      security_alert: "Security Alert",
    };
    return types[type || ""] || type || "Unknown";
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
        <Button onClick={handleExportCSV} disabled={!emailLogs || emailLogs.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
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
            value={filters.emailType}
            onValueChange={(value: any) => setFilters({ ...filters, emailType: value })}
          >
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Email type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="investor_report">Investor Report</SelectItem>
              <SelectItem value="onboarding_welcome">Welcome Email</SelectItem>
              <SelectItem value="password_reset">Password Reset</SelectItem>
              <SelectItem value="withdrawal_confirmation">Withdrawal</SelectItem>
            </SelectContent>
          </Select>
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
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Logs ({emailLogs?.length || 0})</CardTitle>
          <CardDescription>View all emails sent from the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <BarChart3 className="h-6 w-6 animate-pulse text-muted-foreground" />
            </div>
          ) : emailLogs && emailLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.sent_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {log.recipient_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">{log.recipient_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getEmailTypeLabel(log.email_type)}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handlePreview(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {log.external_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`https://mailerlite.com`, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No email logs found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onOpenChange={(open) => setPreviewDialog({ open, emailLog: null })}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>View email information and delivery status</DialogDescription>
          </DialogHeader>

          {previewDialog.emailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Recipient:</span>
                  <p className="text-sm mt-1">{previewDialog.emailLog.recipient_email}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <p className="text-sm mt-1">{getStatusBadge(previewDialog.emailLog.status)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Subject:</span>
                  <p className="text-sm mt-1">{previewDialog.emailLog.subject}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Type:</span>
                  <p className="text-sm mt-1">
                    {getEmailTypeLabel(previewDialog.emailLog.email_type)}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Sent At:</span>
                  <p className="text-sm mt-1">{formatDate(previewDialog.emailLog.sent_at)}</p>
                </div>
                {previewDialog.emailLog.report_month && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Report Month:</span>
                    <p className="text-sm mt-1">{previewDialog.emailLog.report_month}</p>
                  </div>
                )}
              </div>

              {previewDialog.emailLog.error_message && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-sm font-medium text-red-700">Error:</span>
                  <p className="text-sm text-red-600 mt-1">
                    {previewDialog.emailLog.error_message}
                  </p>
                </div>
              )}

              {previewDialog.emailLog.external_id && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">External ID:</span>
                  <p className="text-sm text-blue-600 mt-1 font-mono">
                    {previewDialog.emailLog.external_id}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
