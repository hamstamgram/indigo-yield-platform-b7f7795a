/**
 * IB Payouts Page - Dashboard + History
 * Shows platform-wide IB commission summary, per-IB breakdown, and full history log
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  PageLoadingSpinner,
  SortableTableHead,
} from "@/components/ui";
import { formatAssetAmount } from "@/utils/assets";
import { format } from "date-fns";
import { Coins, Users, TrendingUp, Download, ChevronDown, ChevronRight } from "lucide-react";
import { useIBPayoutDashboard, useIBAllocationsForPayout } from "@/hooks/data/admin";
import { CryptoIcon } from "@/components/CryptoIcons";
import { useSortableColumns } from "@/hooks";
import { cn } from "@/lib/utils";
import type { IBSummaryRow } from "@/services/admin/ibPayoutService";

export default function IBPayoutsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedIBId, setExpandedIBId] = useState<string | null>(null);

  const { data: dashboard, isLoading: dashboardLoading } = useIBPayoutDashboard();
  const { data: allocations, isLoading: allocationsLoading } =
    useIBAllocationsForPayout(statusFilter);

  const { sortConfig, requestSort, sortedData } = useSortableColumns(allocations || [], {
    column: "effectiveDate",
    direction: "desc",
  });

  const isLoading = dashboardLoading || allocationsLoading;

  const toggleIBExpand = (ibId: string) => {
    setExpandedIBId((prev) => (prev === ibId ? null : ibId));
  };

  // Get allocations for expanded IB
  const getIBAllocations = (ibId: string) =>
    sortedData?.filter((a) => a.ibInvestorId === ibId) || [];

  const handleExportCsv = () => {
    if (!sortedData?.length) return;
    const headers = [
      "IB Name",
      "Source Investor",
      "Fund",
      "Asset",
      "Amount",
      "Period",
      "Status",
      "Date",
    ];
    const rows = sortedData.map((item) => [
      item.ibName,
      item.sourceInvestorName,
      item.fundName,
      item.asset,
      String(item.ibFeeAmount),
      item.periodStart && item.periodEnd
        ? `${item.periodStart} to ${item.periodEnd}`
        : item.effectiveDate,
      item.payoutStatus,
      item.effectiveDate,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ib-commissions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  const totalAllTime = dashboard
    ? Object.values(dashboard.totalCommissionByAsset).reduce((s, v) => s + v, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IB Commission Dashboard</h1>
          <p className="text-muted-foreground">Platform-wide IB commission overview and history</p>
        </div>
        <Button variant="outline" onClick={handleExportCsv} disabled={!sortedData?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Section 1: Platform-Wide Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commission (All-Time)</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboard && Object.keys(dashboard.totalCommissionByAsset).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(dashboard.totalCommissionByAsset).map(([asset, amount]) => (
                  <div key={asset} className="flex items-center gap-2">
                    <CryptoIcon symbol={asset} className="h-4 w-4" />
                    <span className="text-lg font-bold">{formatAssetAmount(amount, asset)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-2xl font-bold">0</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active IBs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard?.activeIBCount || 0}</p>
            <p className="text-xs text-muted-foreground">With commission records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission MTD</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboard && Object.keys(dashboard.mtdCommissionByAsset).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(dashboard.mtdCommissionByAsset).map(([asset, amount]) => (
                  <div key={asset} className="flex items-center gap-2">
                    <CryptoIcon symbol={asset} className="h-4 w-4" />
                    <span className="text-lg font-bold">{formatAssetAmount(amount, asset)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-2xl font-bold">-</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid vs Pending</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-lg font-bold text-emerald-600">{dashboard?.paidCount || 0}</p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
              <span className="text-muted-foreground">/</span>
              <div>
                <p className="text-lg font-bold text-amber-600">{dashboard?.pendingCount || 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
            {totalAllTime > 0 && (
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.round(
                      ((dashboard?.paidCount || 0) /
                        ((dashboard?.paidCount || 0) + (dashboard?.pendingCount || 0))) *
                        100
                    )}%`,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 2: IB Summary Table */}
      {dashboard?.ibSummaries && dashboard.ibSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>IB Summary</CardTitle>
            <CardDescription>Click a row to see per-IB commission detail</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>IB Name</TableHead>
                  <TableHead className="text-center">Referred Investors</TableHead>
                  <TableHead>Total Commission</TableHead>
                  <TableHead>Latest Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.ibSummaries.map((ib: IBSummaryRow) => (
                  <>
                    <TableRow
                      key={ib.ibId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleIBExpand(ib.ibId)}
                    >
                      <TableCell>
                        {expandedIBId === ib.ibId ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ib.ibName}</p>
                          <p className="text-xs text-muted-foreground">{ib.ibEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{ib.referredInvestorCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(ib.totalCommissionByAsset).map(([asset, amount]) => (
                            <div key={asset} className="flex items-center gap-1">
                              <CryptoIcon symbol={asset} className="h-4 w-4" />
                              <span className="text-sm font-mono font-medium">
                                {formatAssetAmount(amount, asset)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ib.latestPayoutDate
                          ? format(new Date(ib.latestPayoutDate), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>

                    {/* Section 3: Per-IB Detail (expanded) */}
                    {expandedIBId === ib.ibId && (
                      <TableRow key={`${ib.ibId}-detail`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-0">
                          <div className="p-4">
                            <p className="text-sm font-medium mb-2">
                              Commission History for {ib.ibName}
                            </p>
                            {getIBAllocations(ib.ibId).length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Source Investor</TableHead>
                                    <TableHead>Fund</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {getIBAllocations(ib.ibId).map((comm) => (
                                    <TableRow key={comm.id}>
                                      <TableCell className="text-sm">
                                        {comm.sourceInvestorName}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <CryptoIcon symbol={comm.asset} className="h-4 w-4" />
                                          <span className="text-sm">{comm.fundName}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {comm.periodStart && comm.periodEnd
                                          ? `${format(new Date(comm.periodStart), "MMM d")} - ${format(new Date(comm.periodEnd), "MMM d, yyyy")}`
                                          : format(new Date(comm.effectiveDate), "MMM d, yyyy")}
                                      </TableCell>
                                      <TableCell className="text-right font-mono font-medium">
                                        {formatAssetAmount(comm.ibFeeAmount, comm.asset)}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Badge
                                          variant={
                                            comm.payoutStatus === "paid" ? "default" : "outline"
                                          }
                                          className={cn(
                                            comm.payoutStatus === "paid" &&
                                              "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                          )}
                                        >
                                          {comm.payoutStatus === "paid" ? "Paid" : "Pending"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No records match current filter
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Full History Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Full Commission History</CardTitle>
              <CardDescription>
                All IB allocation records. Commissions are auto-settled during reporting yield
                distribution.
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sortedData && sortedData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="ibName" currentSort={sortConfig} onSort={requestSort}>
                    IB
                  </SortableTableHead>
                  <TableHead>Source Investor</TableHead>
                  <TableHead>Fund</TableHead>
                  <SortableTableHead
                    column="effectiveDate"
                    currentSort={sortConfig}
                    onSort={requestSort}
                  >
                    Period
                  </SortableTableHead>
                  <SortableTableHead
                    column="ibFeeAmount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-right"
                  >
                    Amount
                  </SortableTableHead>
                  <SortableTableHead
                    column="payoutStatus"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-center"
                  >
                    Status
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((comm) => (
                  <TableRow key={comm.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{comm.ibName}</p>
                        <p className="text-xs text-muted-foreground">{comm.ibEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{comm.sourceInvestorName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={comm.asset} className="h-4 w-4" />
                        <span className="text-sm">{comm.fundName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {comm.periodStart && comm.periodEnd
                        ? `${format(new Date(comm.periodStart), "MMM d")} - ${format(new Date(comm.periodEnd), "MMM d, yyyy")}`
                        : format(new Date(comm.effectiveDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatAssetAmount(comm.ibFeeAmount, comm.asset)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={comm.payoutStatus === "paid" ? "default" : "outline"}
                        className={cn(
                          comm.payoutStatus === "paid" &&
                            "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        )}
                      >
                        {comm.payoutStatus === "paid" ? "Paid" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-12">No commission records found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
