/**
 * Admin Transaction History Page
 * Complete chronological ledger of all investor transactions
 * Categories: First Investment | Top-up | Withdrawal | Withdrawal All
 * Features: View, Edit, Void transactions with audit trail
 */

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TruncatedText,
  SortableTableHead,
  QueryErrorBoundary,
  DateTimePicker,
} from "@/components/ui";
import { PageHeader } from "@/components/layout";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CreditCard,
  Plus,
  MoreHorizontal,
  Ban,
  Lock,
} from "lucide-react";
import { AdminGuard } from "@/components/admin";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { AddTransactionDialog, VoidTransactionDialog } from "@/components/admin";
import { useSortableColumns } from "@/hooks";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { useAdminActiveFunds, useAdminTransactions } from "@/hooks/data";

import type { TransactionType, TransactionViewModel } from "@/types/domains/transaction";
import { formatAssetValue } from "@/utils/formatters";
import { ExportButton } from "@/components/common";
import type { ExportColumn } from "@/lib/export/csv-export";

const PAGE_SIZE = 50;

const txExportColumns: ExportColumn[] = [
  { key: "txDate", label: "Date" },
  { key: "investorName", label: "Investor" },
  { key: "investorEmail", label: "Email" },
  { key: "fundName", label: "Fund" },
  { key: "asset", label: "Asset" },
  { key: "displayType", label: "Category" },
  { key: "type", label: "Base Type" },
  { key: "amount", label: "Amount" },
  { key: "isVoided", label: "Voided" },
  { key: "notes", label: "Notes" },
];

function TransactionHistoryContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Void dialog state
  const [selectedTx, setSelectedTx] = useState<TransactionViewModel | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDisplayType, setSelectedDisplayType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [datetimeFrom, setDatetimeFrom] = useState<string | undefined>(undefined);
  const [datetimeTo, setDatetimeTo] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dialogInvestorId, setDialogInvestorId] = useState<string>("");
  const [dialogFundId, setDialogFundId] = useState<string>("");
  const [showVoided, setShowVoided] = useState(false);

  // Fetch active funds via hook
  const { data: funds = [] } = useAdminActiveFunds();

  // Check URL for action=add to auto-open modal
  useEffect(() => {
    const action = searchParams.get("action");
    const investorId = searchParams.get("investorId") || "";
    const fundId = searchParams.get("fundId") || "";

    if (action === "add") {
      setDialogInvestorId(investorId);
      setDialogFundId(fundId || (funds.length > 0 ? funds[0].id : ""));
      setAddDialogOpen(true);
      // Clear the action param after opening
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.delete("action");
          return newParams;
        },
        { replace: true }
      );
    }
  }, [searchParams, funds, setSearchParams]);

  // Quick date presets - use ISO datetime strings with start/end of day times
  const setThisMonth = () => {
    const now = new Date();
    const start = startOfMonth(now);
    start.setHours(0, 0, 0, 0);
    const end = endOfMonth(now);
    end.setHours(23, 59, 59, 999);
    setDatetimeFrom(start.toISOString());
    setDatetimeTo(end.toISOString());
    setPage(0);
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    const start = startOfMonth(lastMonth);
    start.setHours(0, 0, 0, 0);
    const end = endOfMonth(lastMonth);
    end.setHours(23, 59, 59, 999);
    setDatetimeFrom(start.toISOString());
    setDatetimeTo(end.toISOString());
    setPage(0);
  };

  const setYTD = () => {
    const now = new Date();
    const start = startOfYear(now);
    start.setHours(0, 0, 0, 0);
    now.setHours(23, 59, 59, 999);
    setDatetimeFrom(start.toISOString());
    setDatetimeTo(now.toISOString());
    setPage(0);
  };

  const clearFilters = () => {
    setDatetimeFrom(undefined);
    setDatetimeTo(undefined);
    setSelectedFund("all");
    setSelectedType("all");
    setSelectedDisplayType("all");
    setSearchTerm("");
    setPage(0);
  };

  // Fetch transactions via hook
  const { data: result, isLoading } = useAdminTransactions(
    {
      fundId: selectedFund,
      type: selectedType !== "all" ? (selectedType as TransactionType) : undefined,
      datetimeFrom: datetimeFrom,
      datetimeTo: datetimeTo,
      showVoided,
      page,
      pageSize: PAGE_SIZE,
    },
    funds
  );

  const transactions = result?.transactions || [];
  const totalCount = result?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Filter by search term and display type (client-side for these)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          tx.investorName.toLowerCase().includes(search) ||
          tx.investorEmail.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Display type filter
      if (selectedDisplayType !== "all") {
        if (tx.displayType !== selectedDisplayType) return false;
      }

      return true;
    });
  }, [transactions, searchTerm, selectedDisplayType]);

  // Sortable columns hook
  const { sortConfig, requestSort, sortedData } = useSortableColumns(filteredTransactions, {
    column: "txDate",
    direction: "desc",
  });

  const formatAmount = (amount: number, asset: string, type: string) => {
    const isNegative = type === "WITHDRAWAL" || type === "FEE";
    const sign = isNegative ? "-" : "+";
    const formatted = formatAssetValue(Math.abs(amount), asset);
    return `${sign}${formatted}`;
  };

  const getTypeBadgeVariant = (
    displayType: string
  ): "default" | "destructive" | "secondary" | "outline" => {
    switch (displayType) {
      case "First Investment":
        return "default";
      case "Top-up":
        return "secondary";
      case "Withdrawal":
      case "Withdrawal All":
        return "destructive";
      case "Fee":
        return "outline";
      default:
        return "outline";
    }
  };

  const handleAddTransactionSuccess = () => {
    invalidateAfterTransaction(
      queryClient,
      dialogInvestorId || undefined,
      dialogFundId || undefined
    );
    setAddDialogOpen(false);
  };

  const handleOpenAddDialog = () => {
    setDialogInvestorId("");
    setDialogFundId(funds.length > 0 ? funds[0].id : "");
    setAddDialogOpen(true);
  };

  const handleInvestorClick = (investorId: string) => {
    navigate(`/admin/investors/${investorId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction History"
        subtitle="Complete chronological ledger of all investor transactions"
        icon={CreditCard}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={setThisMonth}>
              This Month
            </Button>
            <Button variant="outline" size="sm" onClick={setLastMonth}>
              Last Month
            </Button>
            <Button variant="outline" size="sm" onClick={setYTD}>
              YTD
            </Button>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVoided}
                  onChange={(e) => {
                    setShowVoided(e.target.checked);
                    setPage(0);
                  }}
                  className="rounded border-muted-foreground"
                />
                <span className="text-muted-foreground">Show voided</span>
              </label>
            </div>
          </div>

          {/* Main Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by investor name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={selectedFund}
              onValueChange={(v) => {
                setSelectedFund(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by fund" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedType}
              onValueChange={(v) => {
                setSelectedType(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Base type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Base Types</SelectItem>
                <SelectItem value="DEPOSIT">Deposits</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                <SelectItem value="YIELD">Yield</SelectItem>
                <SelectItem value="FEE_CREDIT">Fee Credits</SelectItem>
                <SelectItem value="IB_CREDIT">IB Credits</SelectItem>
                <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDisplayType} onValueChange={setSelectedDisplayType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="First Investment">First Investment</SelectItem>
                <SelectItem value="Top-up">Top-up</SelectItem>
                <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                <SelectItem value="Withdrawal All">Withdrawal All</SelectItem>
                <SelectItem value="Yield">Yield</SelectItem>
                <SelectItem value="Fee Credit">Fee Credit</SelectItem>
                <SelectItem value="IB Credit">IB Credit</SelectItem>
                <SelectItem value="Adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>

            <DateTimePicker
              value={datetimeFrom}
              onChange={(v) => {
                setDatetimeFrom(v);
                setPage(0);
              }}
              placeholder="From date & time"
              label="From"
              showTime={true}
              defaultTime="00:00"
              className="w-52"
            />
            <DateTimePicker
              value={datetimeTo}
              onChange={(v) => {
                setDatetimeTo(v);
                setPage(0);
              }}
              placeholder="To date & time"
              label="To"
              showTime={true}
              defaultTime="23:59"
              className="w-52"
            />
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle>
              {totalCount.toLocaleString()} Transaction{totalCount !== 1 ? "s" : ""}
            </CardTitle>
            <ExportButton
              data={filteredTransactions}
              columns={txExportColumns}
              filename="transactions"
              disabled={filteredTransactions.length === 0}
            />
            <Button onClick={handleOpenAddDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      column="txDate"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="min-w-[120px]"
                    >
                      Date
                    </SortableTableHead>
                    <SortableTableHead
                      column="investorName"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="min-w-[180px]"
                    >
                      Investor
                    </SortableTableHead>
                    <SortableTableHead
                      column="fundName"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="min-w-[120px]"
                    >
                      Fund
                    </SortableTableHead>
                    <SortableTableHead
                      column="displayType"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="min-w-[130px]"
                    >
                      Type
                    </SortableTableHead>
                    <SortableTableHead
                      column="amount"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="text-right min-w-[140px]"
                    >
                      Amount
                    </SortableTableHead>
                    <TableHead className="min-w-[200px]">Notes</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedData.map((tx) => (
                      <TableRow key={tx.id} className={tx.isVoided ? "opacity-50 bg-muted/30" : ""}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(tx.txDate), "MMM d, yyyy")}
                          {tx.createdAt && (
                            <span className="block text-xs text-muted-foreground">
                              {format(new Date(tx.createdAt), "HH:mm")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleInvestorClick(tx.investorId)}
                            className="text-left hover:underline group max-w-[180px]"
                          >
                            <span className="font-medium flex items-center gap-1">
                              <TruncatedText text={tx.investorName} className="max-w-[150px]" />
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </span>
                            <TruncatedText
                              text={tx.investorEmail}
                              className="text-xs text-muted-foreground block max-w-[160px]"
                            />
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CryptoIcon symbol={tx.asset} className="h-5 w-5" />
                            <span>{tx.fundName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant={getTypeBadgeVariant(tx.displayType)}>
                              {tx.displayType}
                            </Badge>
                            {tx.isVoided && (
                              <Badge variant="destructive" className="text-[10px]">
                                VOIDED
                              </Badge>
                            )}
                            {tx.visibilityScope === "admin_only" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] gap-0.5 text-muted-foreground border-muted-foreground/30"
                              >
                                <Lock className="h-2.5 w-2.5" />
                                Admin
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <div className="flex items-center justify-end gap-1.5">
                            <span
                              className={
                                tx.isVoided
                                  ? "line-through text-muted-foreground"
                                  : tx.type === "WITHDRAWAL" || tx.type === "FEE"
                                    ? "text-destructive"
                                    : "text-green-600"
                              }
                            >
                              {formatAmount(parseFloat(tx.amount), tx.asset, tx.type)}
                            </span>
                            <CryptoIcon symbol={tx.asset} className="h-4 w-4" />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <TruncatedText
                            text={tx.notes || "—"}
                            className="text-muted-foreground"
                            maxWidth="200px"
                          />
                        </TableCell>
                        <TableCell>
                          {!tx.isVoided ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTx(tx);
                                    setVoidDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Void
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Add Transaction Modal */}
      <AddTransactionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        investorId={dialogInvestorId}
        fundId={dialogFundId}
        onSuccess={handleAddTransactionSuccess}
      />

      {/* Void Transaction Modal */}
      <VoidTransactionDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        transaction={selectedTx}
        onSuccess={() => {
          invalidateAfterTransaction(
            queryClient,
            selectedTx?.investorId,
            selectedTx?.fundId || undefined
          );
        }}
      />
    </div>
  );
}

export default function AdminTransactionsPage() {
  return (
    <AdminGuard>
      <QueryErrorBoundary>
        <TransactionHistoryContent />
      </QueryErrorBoundary>
    </AdminGuard>
  );
}
