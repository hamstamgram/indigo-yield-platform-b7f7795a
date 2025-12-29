/**
 * Admin Transaction History Page
 * Complete chronological ledger of all investor transactions
 * Categories: First Investment | Top-up | Withdrawal | Withdrawal All
 * Features: View, Edit, Void transactions with audit trail
 */

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Search, ChevronLeft, ChevronRight, ExternalLink, CreditCard, Plus, MoreHorizontal, Pencil, Ban, Lock } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { AddTransactionDialog } from "@/components/admin/AddTransactionDialog";
import { VoidTransactionDialog } from "@/components/admin/transactions/VoidTransactionDialog";
import { EditTransactionDialog } from "@/components/admin/transactions/EditTransactionDialog";
import { useSortableColumns } from "@/hooks";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { useActiveFunds, useAdminTransactions } from "@/hooks/data/useAdminTransactionHistory";

import type { TransactionType, TransactionViewModel } from "@/types/domains/transaction";

const PAGE_SIZE = 50;

function TransactionHistoryContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Edit/Void dialog state
  const [selectedTx, setSelectedTx] = useState<TransactionViewModel | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDisplayType, setSelectedDisplayType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dialogInvestorId, setDialogInvestorId] = useState<string>("");
  const [dialogFundId, setDialogFundId] = useState<string>("");
  const [showVoided, setShowVoided] = useState(false);

  // Fetch active funds via hook
  const { data: funds = [] } = useActiveFunds();

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
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete("action");
        return newParams;
      }, { replace: true });
    }
  }, [searchParams, funds, setSearchParams]);

  // Quick date presets
  const setThisMonth = () => {
    const now = new Date();
    setDateFrom(format(startOfMonth(now), "yyyy-MM-dd"));
    setDateTo(format(endOfMonth(now), "yyyy-MM-dd"));
    setPage(0);
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setDateFrom(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
    setDateTo(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
    setPage(0);
  };

  const setYTD = () => {
    const now = new Date();
    setDateFrom(format(startOfYear(now), "yyyy-MM-dd"));
    setDateTo(format(now, "yyyy-MM-dd"));
    setPage(0);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
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
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
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
    column: 'txDate',
    direction: 'desc',
  });

  const formatAmount = (amount: number, asset: string, type: string) => {
    const isNegative = type === "WITHDRAWAL" || type === "FEE";
    const sign = isNegative ? "-" : "+";
    
    let formatted: string;
    if (asset === "BTC") formatted = amount.toFixed(8);
    else if (asset === "ETH" || asset === "SOL") formatted = amount.toFixed(6);
    else formatted = amount.toFixed(2);
    
    return `${sign}${formatted}`;
  };

  const getTypeBadgeVariant = (displayType: string): "default" | "destructive" | "secondary" | "outline" => {
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
    invalidateAfterTransaction(queryClient, dialogInvestorId || undefined, dialogFundId || undefined);
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
            <Button variant="outline" size="sm" onClick={setThisMonth}>This Month</Button>
            <Button variant="outline" size="sm" onClick={setLastMonth}>Last Month</Button>
            <Button variant="outline" size="sm" onClick={setYTD}>YTD</Button>
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear All</Button>
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVoided}
                  onChange={(e) => { setShowVoided(e.target.checked); setPage(0); }}
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
            
            <Select value={selectedFund} onValueChange={(v) => { setSelectedFund(v); setPage(0); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by fund" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>{fund.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setPage(0); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Base type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Base Types</SelectItem>
                <SelectItem value="DEPOSIT">Deposits</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                <SelectItem value="FEE">Fees</SelectItem>
                <SelectItem value="INTEREST">Interest/Yield</SelectItem>
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
                <SelectItem value="Fee">Fee</SelectItem>
                <SelectItem value="Interest/Yield">Interest/Yield</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="w-40"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="w-40"
              placeholder="To"
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
                onClick={() => setPage(p => Math.max(0, p - 1))}
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
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
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
                            <TruncatedText text={tx.investorEmail} className="text-xs text-muted-foreground block max-w-[160px]" />
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
                              <Badge variant="outline" className="text-[10px] gap-0.5 text-muted-foreground border-muted-foreground/30">
                                <Lock className="h-2.5 w-2.5" />
                                Admin
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={tx.isVoided ? "line-through text-muted-foreground" : (tx.type === "WITHDRAWAL" || tx.type === "FEE" ? "text-destructive" : "text-green-600")}>
                            {formatAmount(tx.amount, tx.asset, tx.type)}
                          </span>
                          <span className="text-muted-foreground ml-1">{tx.asset}</span>
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
                                    setEditDialogOpen(true);
                                  }}
                                  disabled={tx.isSystemGenerated}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
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
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
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

      {/* Edit Transaction Modal */}
      <EditTransactionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        transaction={selectedTx}
        onSuccess={() => {
          invalidateAfterTransaction(queryClient, selectedTx?.investorId, selectedTx?.fundId || undefined);
        }}
      />

      {/* Void Transaction Modal */}
      <VoidTransactionDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        transaction={selectedTx}
        onSuccess={() => {
          invalidateAfterTransaction(queryClient, selectedTx?.investorId, selectedTx?.fundId || undefined);
        }}
      />
    </div>
  );
}

export default function AdminTransactionsPage() {
  return (
    <AdminGuard>
      <TransactionHistoryContent />
    </AdminGuard>
  );
}
