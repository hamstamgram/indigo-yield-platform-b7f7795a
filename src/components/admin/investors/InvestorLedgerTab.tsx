/**
 * Investor Ledger Tab (formerly Transactions Tab)
 * Shows transaction history with URL-persisted filters
 * Uses React Query for proper cache invalidation
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  BookOpen,
  Filter,
  X,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Plus,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Ban,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { toast } from "@/hooks";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useUrlFilters, useInvestorLedger } from "@/hooks";
import { AddTransactionDialog } from "@/components/admin/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/admin/transactions/EditTransactionDialog";
import { VoidTransactionDialog } from "@/components/admin/transactions/VoidTransactionDialog";

interface InvestorLedgerTabProps {
  investorId: string;
  investorName?: string;
  onDataChange?: () => void;
}

const TX_TYPES = [
  { value: "all", label: "All Types" },
  { value: "DEPOSIT", label: "Deposit" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
  { value: "YIELD", label: "Yield" },
  { value: "FEE", label: "Fee" },
  { value: "FEE_CREDIT", label: "Fee Credit" },
  { value: "IB_CREDIT", label: "IB Credit" },
  { value: "INTEREST", label: "Interest" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const TX_PURPOSE = [
  { value: "all", label: "All Purpose" },
  { value: "reporting", label: "Reporting" },
  { value: "transaction", label: "Transaction" },
];

export function InvestorLedgerTab({ investorId, investorName, onDataChange }: InvestorLedgerTabProps) {
  const { filters, setFilter, clearFilters, hasActiveFilters, getFilter } = useUrlFilters({
    keys: ["txType", "txPurpose", "dateFrom", "dateTo"],
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const [addTxDialogOpen, setAddTxDialogOpen] = useState(false);
  const [defaultFundId, setDefaultFundId] = useState<string>("");
  
  // Edit and Void dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<{
    id: string;
    type: string;
    amount: number;
    asset: string;
    investorName: string;
    txDate: string;
    notes: string | null;
    txHash?: string | null;
    isSystemGenerated?: boolean;
  } | null>(null);

  // Convert URL filters to hook filters
  const ledgerFilters = useMemo(() => ({
    txType: getFilter("txType"),
    txPurpose: getFilter("txPurpose"),
    dateFrom: getFilter("dateFrom"),
    dateTo: getFilter("dateTo"),
    showVoided,
  }), [getFilter, showVoided]);

  // Use React Query hook for transactions
  const {
    transactions,
    isLoading: loading,
    error,
    refetch,
    invalidateAll,
    forceRefetch,
  } = useInvestorLedger(investorId, ledgerFilters);
  
  // Also fetch unfiltered count to show filter impact
  const { transactions: unfilteredTransactions } = useInvestorLedger(investorId, { showVoided: true });

  // Fetch default fund for this investor
  useEffect(() => {
    const fetchDefaultFund = async () => {
      const { data } = await supabase
        .from("investor_positions")
        .select("fund_id")
        .eq("investor_id", investorId)
        .limit(1)
        .maybeSingle();
      if (data?.fund_id) setDefaultFundId(data.fund_id);
    };
    fetchDefaultFund();
  }, [investorId]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`ledger-${investorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions_v2",
          filter: `investor_id=eq.${investorId}`,
        },
        () => {
          invalidateAll();
          onDataChange?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [investorId, invalidateAll, onDataChange]);

  const handleAddTxSuccess = useCallback(() => {
    invalidateAll();
    onDataChange?.();
    setAddTxDialogOpen(false);
  }, [invalidateAll, onDataChange]);

  const handleEditVoidSuccess = useCallback(() => {
    invalidateAll();
    onDataChange?.();
    setEditDialogOpen(false);
    setVoidDialogOpen(false);
    setSelectedTransaction(null);
  }, [invalidateAll, onDataChange]);

  const handleResetAndRefresh = useCallback(async () => {
    clearFilters();
    setShowVoided(false);
    await forceRefetch();
    toast({
      title: "Data refreshed",
      description: "Transaction list has been updated.",
    });
  }, [clearFilters, forceRefetch]);

  // Calculate hidden transaction count
  const hiddenCount = unfilteredTransactions.length - transactions.length;

  // Prepare transaction for edit/void dialog
  const openEditDialog = useCallback((tx: typeof transactions[0]) => {
    setSelectedTransaction({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      asset: tx.asset,
      investorName: investorName || "Unknown",
      txDate: tx.tx_date,
      notes: tx.notes || null,
      txHash: tx.tx_hash || null,
      isSystemGenerated: tx.is_system_generated || false,
    });
    setEditDialogOpen(true);
  }, [investorName]);

  const openVoidDialog = useCallback((tx: typeof transactions[0]) => {
    setSelectedTransaction({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      asset: tx.asset,
      investorName: investorName || "Unknown",
      txDate: tx.tx_date,
      notes: tx.notes || null,
      txHash: tx.tx_hash || null,
      isSystemGenerated: tx.is_system_generated || false,
    });
    setVoidDialogOpen(true);
  }, [investorName]);

  const getTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (["deposit", "subscription", "transfer_in", "yield", "interest", "fee_credit", "ib_credit"].includes(lowerType)) {
      return <ArrowDownRight className="h-3.5 w-3.5 text-green-600" />;
    }
    if (["withdrawal", "transfer_out", "fee"].includes(lowerType)) {
      return <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />;
    }
    return <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getPurposeBadge = (purpose: string | null) => {
    if (!purpose) return null;
    return (
      <Badge variant="outline" className="text-[10px]">
        {purpose}
      </Badge>
    );
  };

  // Track query data count for diagnostics
  const queryDataCount = transactions.length;

  return (
    <div className="space-y-4">
      {/* Header with Add Transaction Button and Filters Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Transaction Ledger</h3>
          <Badge variant="secondary" className="text-xs" title={`Showing ${transactions.length} of ${unfilteredTransactions.length} total`}>
            {transactions.length}{unfilteredTransactions.length !== transactions.length ? ` / ${unfilteredTransactions.length}` : ''} records
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setAddTxDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Transaction
          </Button>
          {/* Show Voided Toggle */}
          <Button
            variant={showVoided ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowVoided(!showVoided)}
            title={showVoided ? "Hide voided transactions" : "Show voided transactions"}
          >
            {showVoided ? (
              <Eye className="h-4 w-4 mr-1" />
            ) : (
              <EyeOff className="h-4 w-4 mr-1" />
            )}
            {showVoided ? "Showing Voided" : "Show Voided"}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="default" className="ml-2 h-4 px-1 text-[10px]">
                Active
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Diagnostic: Filter Impact Banner - More prominent */}
      {!loading && hiddenCount > 0 && (
        <Alert variant="default" className="bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Filter className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold">
                Filters Active — {hiddenCount} transaction{hiddenCount !== 1 ? 's' : ''} hidden
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>Showing {transactions.length} of {unfilteredTransactions.length}.</span>
                    {!showVoided && (
                      <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300">
                        Voided hidden
                      </Badge>
                    )}
                    {hasActiveFilters && (
                      <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300">
                        Filters applied
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetAndRefresh}
                    className="h-7 text-xs border-amber-400 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All & Show Everything
                  </Button>
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Diagnostic: Empty with filters */}
      {!loading && queryDataCount === 0 && !error && hasActiveFilters && hiddenCount === 0 && (
        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">No matching transactions</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            <div className="flex items-center gap-2">
              <span>Current filters may be excluding transactions.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetAndRefresh}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Clear & Refresh
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Query Error</AlertTitle>
          <AlertDescription>
            {error.message}
            <Button variant="link" onClick={() => refetch()} className="ml-2 h-auto p-0">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Row */}
      {showFilters && (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Type Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <Select
                  value={getFilter("txType", "all")}
                  onValueChange={(v) => setFilter("txType", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {TX_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Purpose Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Purpose</label>
                <Select
                  value={getFilter("txPurpose", "all")}
                  onValueChange={(v) => setFilter("txPurpose", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {TX_PURPOSE.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="text-xs">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={getFilter("dateFrom", "")}
                    onChange={(e) => setFilter("dateFrom", e.target.value)}
                    className="h-8 text-xs pl-7"
                  />
                </div>
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={getFilter("dateTo", "")}
                    onChange={(e) => setFilter("dateTo", e.target.value)}
                    className="h-8 text-xs pl-7"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No transactions found</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters to see all transactions
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs h-9 w-[100px]">Date</TableHead>
                <TableHead className="text-xs h-9">Type</TableHead>
                <TableHead className="text-xs h-9">Fund</TableHead>
                <TableHead className="text-xs h-9 text-right">Amount</TableHead>
                <TableHead className="text-xs h-9">Purpose</TableHead>
                <TableHead className="text-xs h-9 w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className={`text-xs ${tx.is_voided ? "opacity-50 line-through" : ""}`}>
                  <TableCell className="py-2 font-mono">
                    {format(new Date(tx.tx_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getTypeIcon(tx.type)}
                      <span className="capitalize">{tx.type.replace(/_/g, " ").toLowerCase()}</span>
                      {tx.is_voided && <Badge variant="destructive" className="text-[9px]">Voided</Badge>}
                      {tx.visibility_scope === "admin_only" && (
                        <Badge variant="outline" className="text-[9px] gap-0.5 text-muted-foreground border-muted-foreground/30">
                          <Lock className="h-2.5 w-2.5" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    {tx.fund?.name || "-"}
                  </TableCell>
                  <TableCell className="py-2 text-right font-mono">
                    <span className={tx.amount >= 0 ? "text-green-600" : "text-red-600"}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(4)}
                    </span>
                    <span className="text-muted-foreground ml-1">{tx.asset}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    {getPurposeBadge(tx.purpose)}
                  </TableCell>
                  <TableCell className="py-2">
                    {!tx.is_voided && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(tx)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openVoidDialog(tx)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Ban className="h-3.5 w-3.5 mr-2" />
                            Void
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={addTxDialogOpen}
        onOpenChange={setAddTxDialogOpen}
        investorId={investorId}
        fundId={defaultFundId}
        onSuccess={handleAddTxSuccess}
      />

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        transaction={selectedTransaction}
        onSuccess={handleEditVoidSuccess}
      />

      {/* Void Transaction Dialog */}
      <VoidTransactionDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        transaction={selectedTransaction}
        onSuccess={handleEditVoidSuccess}
      />
    </div>
  );
}

export default InvestorLedgerTab;
