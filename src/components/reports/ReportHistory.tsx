/**
 * Report History Component
 * Displays user's generated reports with download and management options
 */

import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText,
  Download,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ReportsApi } from "@/services/api/reportsApi";
import { GeneratedReport, ReportType, ReportStatus } from "@/types/reports";

export const ReportHistory: React.FC = () => {
  const { toast } = useToast();

  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");
  const [filterType] = useState<ReportType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterType]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (filterStatus !== "all") filters.status = filterStatus;
      if (filterType !== "all") filters.reportType = filterType;

      const data = await ReportsApi.getUserReports(filters);
      setReports(data);
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId: string) => {
    setDownloadingId(reportId);
    try {
      const result = await ReportsApi.downloadReport({ reportId });

      if (result.success && result.downloadUrl) {
        window.open(result.downloadUrl, "_blank");
        toast({
          title: "Success",
          description: "Download started",
        });

        // Refresh reports to update download count
        await loadReports();
      } else {
        throw new Error(result.error || "Download failed");
      }
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Download failed",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) {
      return;
    }

    try {
      const result = await ReportsApi.deleteReport(reportId);

      if (result.success) {
        toast({
          title: "Success",
          description: "Report deleted successfully",
        });
        await loadReports();
      } else {
        throw new Error(result.error || "Delete failed");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Delete failed",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "queued":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Queued
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const formatReportType = (type: ReportType): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const filteredReports = reports.filter((report) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        formatReportType(report.reportType).toLowerCase().includes(query) ||
        report.format.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Report History
        </CardTitle>
        <CardDescription>View and download your previously generated reports</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select
            value={filterStatus}
            onValueChange={(value: ReportStatus | "all") => setFilterStatus(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={loadReports}>
            <Filter className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Reports Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Reports Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || filterStatus !== "all" || filterType !== "all"
                ? "Try adjusting your filters"
                : "Generate your first report to get started"}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatReportType(report.reportType)}</div>
                        {report.dateRangeStart && report.dateRangeEnd && (
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(report.dateRangeStart), "MMM dd")} -{" "}
                            {format(new Date(report.dateRangeEnd), "MMM dd, yyyy")}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.format.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                      </div>
                      {report.downloadCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Downloaded {report.downloadCount} time
                          {report.downloadCount !== 1 ? "s" : ""}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatFileSize(report.fileSizeBytes)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {report.status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(report.id)}
                            disabled={downloadingId === report.id}
                          >
                            {downloadingId === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Download className="mr-1 h-3 w-3" />
                                Download
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(report.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
