import { useState } from "react";
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
} from "@/components/ui";
import { Database, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CryptoIcon } from "@/components/CryptoIcons";
import { useHistoricalReports } from "@/hooks/data";
import { format, subMonths } from "date-fns";
import type { DeliveryStatus } from "@/services/admin/reportQueryService";

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

const HistoricalReportsDashboard: React.FC = () => {
  const [monthFilter, setMonthFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = useHistoricalReports({
    month: monthFilter || undefined,
    page,
    pageSize,
  });

  const reports = data?.reports || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredReports = searchTerm
    ? reports.filter((r) => r.investor_name.toLowerCase().includes(searchTerm.toLowerCase()))
    : reports;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Report History</h1>
        <p className="text-muted-foreground">All generated statements across all periods</p>
      </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-mono text-sm">{report.period_month}</TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/investors/${report.investor_id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {report.investor_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 items-center">
                        {report.fund_names.map((name) => {
                          const asset = getAssetFromFundName(name);
                          return <CryptoIcon key={name} symbol={asset} className="h-5 w-5" />;
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(report.delivery_status)}
                        {report.sent_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(report.sent_at), "MMM d")}
                          </span>
                        )}
                      </div>
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
    </div>
  );
};

export default HistoricalReportsDashboard;
