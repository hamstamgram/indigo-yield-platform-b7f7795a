/**
 * Investor Ledger Tab (formerly Transactions Tab)
 * Shows transaction history with URL-persisted filters
 */

import { useState, useEffect, useCallback } from "react";
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
  BookOpen,
  Filter,
  X,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Plus,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useQueryClient } from "@tanstack/react-query";
import { AddTransactionDialog } from "@/components/admin/AddTransactionDialog";

interface InvestorLedgerTabProps {
  investorId: string;
  investorName?: string;
  onDataChange?: () => void;
}

interface Transaction {
  id: string;
  tx_date: string;
  type: string;
  amount: number;
  purpose: string | null;
  reference_id: string | null;
  notes: string | null;
  asset: string;
  fund?: { name: string; asset: string } | null;
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
  const queryClient = useQueryClient();
  const { filters, setFilter, clearFilters, hasActiveFilters, getFilter } = useUrlFilters({
    keys: ["txType", "txPurpose", "dateFrom", "dateTo"],
  });

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [rawQueryCount, setRawQueryCount] = useState<number>(0);
  const [addTxDialogOpen, setAddTxDialogOpen] = useState(false);
  const [defaultFundId, setDefaultFundId] = useState<string>("");

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

  // Load transactions with filters
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setQueryError(null);
    
    try {
      let query = supabase
        .from("transactions_v2")
        .select(`
          id,
          tx_date,
          type,
          amount,
          purpose,
          reference_id,
          notes,
          asset,
          is_voided,
          fund:funds(name, asset)
        `)
        .eq("investor_id", investorId)
        .eq("is_voided", false) // Exclude voided transactions
        .order("tx_date", { ascending: false })
        .limit(100);

      // Apply filters - cast to proper enum type
      const txType = getFilter("txType");
      if (txType && txType !== "all") {
        query = query.eq("type", txType as any);
      }

      const txPurpose = getFilter("txPurpose");
      if (txPurpose && txPurpose !== "all") {
        query = query.eq("purpose", txPurpose as "reporting" | "transaction");
      }

      const dateFrom = getFilter("dateFrom");
      if (dateFrom) {
        query = query.gte("tx_date", dateFrom);
      }

      const dateTo = getFilter("dateTo");
      if (dateTo) {
        query = query.lte("tx_date", dateTo);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("[InvestorLedgerTab] Query error:", error);
        setQueryError(error.message);
        setTransactions([]);
        setRawQueryCount(0);
        return;
      }

      // Track both raw count and parsed result for mismatch detection
      const rawCount = data?.length || 0;
      setRawQueryCount(rawCount);
      
      console.log(`[InvestorLedgerTab] Loaded ${rawCount} transactions for investor ${investorId}`);
      
      // Safely parse and set transactions
      const parsedTransactions: Transaction[] = [];
      for (const item of (data || [])) {
        try {
          parsedTransactions.push(item as Transaction);
        } catch (parseError) {
          console.error("[InvestorLedgerTab] Failed to parse transaction:", item, parseError);
        }
      }
      
      setTransactions(parsedTransactions);
    } catch (error) {
      console.error("[InvestorLedgerTab] Unexpected error:", error);
      setQueryError(error instanceof Error ? error.message : "Unknown error loading transactions");
      setTransactions([]);
      setRawQueryCount(0);
    } finally {
      setLoading(false);
    }
  }, [investorId, getFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, filters]);

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
          loadTransactions();
          onDataChange?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [investorId, loadTransactions, onDataChange]);

  const handleAddTxSuccess = useCallback(() => {
    // Invalidate all related queries
    queryClient.invalidateQueries({ queryKey: ["admin-transactions-history"] });
    queryClient.invalidateQueries({ queryKey: ["investor-positions", investorId] });
    queryClient.invalidateQueries({ queryKey: ["investor-transactions", investorId] });
    queryClient.invalidateQueries({ queryKey: ["fund-aum"] });
    
    // Reload local data
    loadTransactions();
    onDataChange?.();
    setAddTxDialogOpen(false);
  }, [queryClient, investorId, loadTransactions, onDataChange]);

  const handleResetAndRefresh = useCallback(() => {
    clearFilters();
    loadTransactions();
  }, [clearFilters, loadTransactions]);

  const getTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (["deposit", "subscription", "transfer_in", "yield", "interest", "fee_credit", "ib_credit"].includes(lowerType)) {
      return <ArrowDownRight className="h-3.5 w-3.5 text-green-600" />;
    }
    if (["withdrawal", "redemption", "transfer_out", "fee"].includes(lowerType)) {
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

  // Detect mismatch: query returned data but parsed/rendered count is different
  const hasMismatch = !loading && rawQueryCount > 0 && transactions.length === 0;

  return (
    <div className="space-y-4">
      {/* Header with Add Transaction Button and Filters Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Transaction Ledger</h3>
          <Badge variant="secondary" className="text-xs">
            {transactions.length} records
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

      {/* Error Alert */}
      {queryError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Query Error</AlertTitle>
          <AlertDescription>
            Failed to load transactions: {queryError}
            <Button variant="link" onClick={loadTransactions} className="ml-2 h-auto p-0">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Mismatch Warning */}
      {hasMismatch && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Data Mismatch</AlertTitle>
          <AlertDescription>
            {rawQueryCount} records exist but failed to render. This may be due to data parsing issues.
            <Button variant="link" onClick={handleResetAndRefresh} className="ml-2 h-auto p-0">
              Reset filters and retry
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
      ) : transactions.length === 0 && !hasMismatch ? (
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
      ) : transactions.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs h-9 w-[100px]">Date</TableHead>
                <TableHead className="text-xs h-9">Type</TableHead>
                <TableHead className="text-xs h-9">Fund</TableHead>
                <TableHead className="text-xs h-9 text-right">Amount</TableHead>
                <TableHead className="text-xs h-9">Purpose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="text-xs">
                  <TableCell className="py-2 font-mono">
                    {format(new Date(tx.tx_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      {getTypeIcon(tx.type)}
                      <span className="capitalize">{tx.type.replace(/_/g, " ").toLowerCase()}</span>
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
    </div>
  );
}

export default InvestorLedgerTab;
