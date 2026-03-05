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
import { PageShell } from "@/components/layout/PageShell";
import { TablePagination } from "@/components/common/TablePagination";
import {
  Loader2,
  Search,
  ExternalLink,
  CreditCard,
  Plus,
  MoreHorizontal,
  Ban,
  Lock,
  Undo2,
} from "lucide-react";
import { Checkbox } from "@/components/ui";
import { AdminGuard, useSuperAdmin } from "@/components/admin";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { AddTransactionDialog, VoidTransactionDialog } from "@/components/admin";
import { useSortableColumns } from "@/hooks";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { useAdminActiveFunds, useAdminTransactions } from "@/hooks/data";
import { useTransactionMutations } from "@/hooks/data";
import { useTransactionSelection } from "../hooks/useTransactionSelection";
import { BulkActionToolbar } from "../components/BulkActionToolbar";
import { BulkVoidDialog } from "../components/BulkVoidDialog";
import { BulkUnvoidDialog } from "../components/BulkUnvoidDialog";
import { UnvoidTransactionDialog } from "../components/UnvoidTransactionDialog";
import { cn } from "@/lib/utils";

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

function TransactionHistoryContent({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Dialog state
  const [selectedTx, setSelectedTx] = useState<TransactionViewModel | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [unvoidDialogOpen, setUnvoidDialogOpen] = useState(false);
  const [bulkVoidDialogOpen, setBulkVoidDialogOpen] = useState(false);
  const [bulkUnvoidDialogOpen, setBulkUnvoidDialogOpen] = useState(false);
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

  // Super admin check for bulk operations
  const { isSuperAdmin } = useSuperAdmin();

  // Mutation hooks
  const { unvoidMutation, bulkVoidMutation, bulkUnvoidMutation } = useTransactionMutations();

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

  // Selection for bulk operations
  const selection = useTransactionSelection(sortedData, page, showVoided);

  // Get selected transactions for dialogs
  const selectedTransactions = useMemo(
    () => sortedData.filter((tx) => selection.selectedIds.has(tx.id)),
    [sortedData, selection.selectedIds]
  );

  const formatAmount = (amount: number, asset: string, type: string) => {
    const isNegative = type === "WITHDRAWAL" || type === "FEE";
    const sign = isNegative ? "-" : "+";
    const formatted = formatAssetValue(Math.abs(amount), asset);
    return `${sign}${formatted}`;
  };

  const getTypeBadgeClass = (_displayType: string, type: string) => {
    const base = "rounded-full px-2 py-0.5 text-xs font-semibold";
    switch (type) {
      case "YIELD":
      case "DISTRIBUTION":
        return cn(base, "bg-amber-500/15 text-amber-400 border border-amber-500/20");
      case "DEPOSIT":
      case "FIRST_INVESTMENT":
        return cn(base, "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20");
      case "WITHDRAWAL":
        return cn(base, "bg-rose-500/15 text-rose-400 border border-rose-500/20");
      case "FEE":
        return cn(base, "bg-amber-500/10 text-amber-400 border border-amber-500/20");
      case "FEE_CREDIT":
      case "IB_CREDIT":
        return cn(base, "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20");
      case "DUST":
      case "DUST_SWEEP":
        return cn(base, "bg-amber-100 text-amber-800 border-amber-200");
      case "INTERNAL_CREDIT":
        return cn(base, "bg-teal-500/15 text-teal-400 border border-teal-500/20");
      case "INTERNAL_WITHDRAWAL":
        return cn(base, "bg-slate-500/15 text-slate-400 border border-slate-500/20");
      default:
        return cn(base, "bg-muted text-muted-foreground border border-border/40");
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

  const inner = (
    <>
      {!embedded && <PageHeader title="Transaction History" />}

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 space-y-4">
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
                  <span className="flex items-center gap-2">
                    <CryptoIcon symbol={fund.asset} className="h-4 w-4" />
                    {fund.name}
                  </span>
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
      </div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        summary={selection.summary}
        isSuperAdmin={isSuperAdmin}
        onVoid={() => setBulkVoidDialogOpen(true)}
        onUnvoid={() => setBulkUnvoidDialogOpen(true)}
        onClear={selection.clearSelection}
      />

      {/* Transactions Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">
              {totalCount.toLocaleString()} Transaction{totalCount !== 1 ? "s" : ""}
            </span>
            <ExportButton
              data={filteredTransactions}
              columns={txExportColumns}
              filename="transactions"
              disabled={filteredTransactions.length === 0}
            />
          </div>
          <Button onClick={handleOpenAddDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
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
                    <SortableTableHead
                      column="txDate"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="whitespace-nowrap"
                    >
                      Date
                    </SortableTableHead>
                    <SortableTableHead
                      column="investorName"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="whitespace-nowrap"
                    >
                      Investor
                    </SortableTableHead>
                    <SortableTableHead
                      column="fundName"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="whitespace-nowrap"
                    >
                      Fund
                    </SortableTableHead>
                    <SortableTableHead
                      column="displayType"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="whitespace-nowrap"
                    >
                      Type
                    </SortableTableHead>
                    <SortableTableHead
                      column="amount"
                      currentSort={sortConfig}
                      onSort={requestSort}
                      className="text-right whitespace-nowrap"
                    >
                      Amount
                    </SortableTableHead>
                    <TableHead className="whitespace-nowrap">Notes</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedData.map((tx) => {
                      const canSelect = !tx.isVoided || showVoided;
                      return (
                        <TableRow
                          key={tx.id}
                          className={tx.isVoided ? "opacity-50 bg-muted/30" : ""}
                        >
                          <TableCell className="px-2 py-1.5">
                            {canSelect ? (
                              <Checkbox
                                checked={selection.isSelected(tx.id)}
                                onCheckedChange={() => selection.toggleOne(tx.id)}
                                aria-label={`Select transaction ${tx.id}`}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-1.5">
                            {format(parseISO(tx.txDate), "MMM d, yyyy")}
                            {tx.createdAt && (
                              <span className="block text-muted-foreground">
                                {format(parseISO(tx.createdAt), "HH:mm")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <button
                              onClick={() => handleInvestorClick(tx.investorId)}
                              className="text-left hover:underline group max-w-[140px]"
                            >
                              <span className="font-medium flex items-center gap-1">
                                <TruncatedText text={tx.investorName} className="max-w-[120px]" />
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </span>
                              <TruncatedText
                                text={tx.investorEmail}
                                className="text-muted-foreground block max-w-[120px]"
                              />
                            </button>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <div className="flex items-center gap-1.5">
                              <CryptoIcon symbol={tx.asset} className="h-4 w-4" />
                              <span>{tx.fundName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge
                                variant="outline"
                                className={getTypeBadgeClass(tx.displayType, tx.type)}
                              >
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
                          <TableCell className="text-right font-mono tabular-nums py-1.5">
                            <div className="flex items-center justify-end gap-1">
                              <span
                                className={
                                  tx.isVoided
                                    ? "line-through text-muted-foreground"
                                    : tx.type === "WITHDRAWAL" || tx.type === "FEE"
                                      ? "text-rose-400"
                                      : "text-yield"
                                }
                              >
                                {formatAmount(parseFloat(tx.amount), tx.asset, tx.type)}
                              </span>
                              <CryptoIcon symbol={tx.asset} className="h-3.5 w-3.5" />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[160px] py-1.5">
                            <TruncatedText
                              text={tx.notes || "—"}
                              className="text-muted-foreground"
                              maxWidth="160px"
                            />
                          </TableCell>
                          <TableCell className="py-1.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!tx.isVoided ? (
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
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTx(tx);
                                      setUnvoidDialogOpen(true);
                                    }}
                                  >
                                    <Undo2 className="mr-2 h-4 w-4" />
                                    Restore
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </div>
      </div>

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

      {/* Single Unvoid Transaction Modal */}
      <UnvoidTransactionDialog
        open={unvoidDialogOpen}
        onOpenChange={setUnvoidDialogOpen}
        transaction={selectedTx}
        isPending={unvoidMutation.isPending}
        onConfirm={(reason) => {
          if (!selectedTx) return;
          unvoidMutation.mutate(
            {
              transactionId: selectedTx.id,
              reason,
              investorId: selectedTx.investorId,
              fundId: selectedTx.fundId || undefined,
            },
            {
              onSuccess: () => {
                setUnvoidDialogOpen(false);
                setSelectedTx(null);
              },
            }
          );
        }}
      />

      {/* Bulk Void Dialog */}
      <BulkVoidDialog
        open={bulkVoidDialogOpen}
        onOpenChange={setBulkVoidDialogOpen}
        transactions={selectedTransactions}
        summary={selection.summary}
        isPending={bulkVoidMutation.isPending}
        onConfirm={(reason) => {
          bulkVoidMutation.mutate(
            {
              transactionIds: Array.from(selection.selectedIds),
              reason,
            },
            {
              onSuccess: () => {
                setBulkVoidDialogOpen(false);
                selection.clearSelection();
              },
            }
          );
        }}
      />

      {/* Bulk Unvoid Dialog */}
      <BulkUnvoidDialog
        open={bulkUnvoidDialogOpen}
        onOpenChange={setBulkUnvoidDialogOpen}
        transactions={selectedTransactions}
        summary={selection.summary}
        isPending={bulkUnvoidMutation.isPending}
        onConfirm={(reason) => {
          bulkUnvoidMutation.mutate(
            {
              transactionIds: Array.from(selection.selectedIds),
              reason,
            },
            {
              onSuccess: () => {
                setBulkUnvoidDialogOpen(false);
                selection.clearSelection();
              },
            }
          );
        }}
      />
    </>
  );

  if (embedded) return inner;
  return <PageShell>{inner}</PageShell>;
}

export default function AdminTransactionsPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <AdminGuard>
      <QueryErrorBoundary>
        <TransactionHistoryContent embedded={embedded} />
      </QueryErrorBoundary>
    </AdminGuard>
  );
}
