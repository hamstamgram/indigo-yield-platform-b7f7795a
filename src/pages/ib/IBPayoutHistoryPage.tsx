/**
 * IB Payout History Page
 * Shows all IB commission allocations with status filter (All / Pending / Paid)
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  PageLoadingSpinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  SortableTableHead,
} from "@/components/ui";
import { formatAssetAmount } from "@/utils/assets";
import { format } from "date-fns";
import { Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import { useIBPayoutHistory } from "@/hooks/data/shared";
import { useSortableColumns } from "@/hooks";
import { CryptoIcon } from "@/components/CryptoIcons";

const PAGE_SIZE = 20;

export default function IBPayoutHistoryPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useIBPayoutHistory(page, PAGE_SIZE, statusFilter);

  const { sortConfig, requestSort, sortedData } = useSortableColumns(data?.payouts || [], {
    column: "effectiveDate",
    direction: "desc",
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payout History</h1>
          <p className="text-muted-foreground">Your commission allocations and payout status</p>
        </div>

        <Tabs value={statusFilter} onValueChange={handleFilterChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Commission Records ({data?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedData && sortedData.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      column="effectiveDate"
                      currentSort={sortConfig}
                      onSort={requestSort}
                    >
                      Date
                    </SortableTableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Source Investor</TableHead>
                    <SortableTableHead
                      column="amount"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="text-right"
                    >
                      Commission
                    </SortableTableHead>
                    <SortableTableHead
                      column="status"
                      currentSort={sortConfig}
                      onSort={requestSort}
                    >
                      Status
                    </SortableTableHead>
                    <TableHead>Paid Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>{format(new Date(payout.effectiveDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>{payout.fundName}</TableCell>
                      <TableCell>
                        <CryptoIcon symbol={payout.asset} className="h-5 w-5" />
                      </TableCell>
                      <TableCell>{payout.sourceInvestorName}</TableCell>
                      <TableCell className="text-right font-medium font-mono">
                        {formatAssetAmount(payout.amount, payout.asset)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payout.status === "paid" ? "default" : "secondary"}>
                          {payout.status === "paid" ? "Paid" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payout.paidAt ? format(new Date(payout.paidAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-12">
              No commission records found
              {statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
