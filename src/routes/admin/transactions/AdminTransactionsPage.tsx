/**
 * Admin Transaction History Page
 * Complete chronological ledger of all investor transactions
 * Categories: First Investment | Top-up | Withdrawal | Withdrawal All
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "FEE" | "INTEREST" | "ADJUSTMENT";

interface Transaction {
  id: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  fundId: string | null;
  fundName: string;
  asset: string;
  type: TransactionType;
  displayType: string;
  amount: number;
  txDate: string;
  status: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
}

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

const PAGE_SIZE = 50;

function TransactionHistoryContent() {
  const navigate = useNavigate();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDisplayType, setSelectedDisplayType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  // Load funds
  useEffect(() => {
    supabase
      .from("funds")
      .select("id, code, name, asset")
      .eq("status", "active")
      .order("code")
      .then(({ data }) => setFunds(data || []));
  }, []);

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

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-transactions-history", selectedFund, selectedType, dateFrom, dateTo, page],
    queryFn: async () => {
      // Build query with deterministic ordering: tx_date DESC, id DESC
      let query = supabase
        .from("transactions_v2")
        .select(`
          id, investor_id, fund_id, type, asset, amount, tx_date, status, notes, created_at, created_by,
          profiles!fk_transactions_v2_profile (email, first_name, last_name)
        `, { count: "exact" })
        .order("tx_date", { ascending: false })
        .order("id", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (selectedFund !== "all") {
        query = query.eq("fund_id", selectedFund);
      }
      if (selectedType !== "all") {
        query = query.eq("type", selectedType as TransactionType);
      }
      if (dateFrom) {
        query = query.gte("tx_date", dateFrom);
      }
      if (dateTo) {
        query = query.lte("tx_date", dateTo);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Track first deposits per investor+fund to categorize as "First Investment"
      // Need to fetch all deposits for these investors to determine first
      const investorIds = [...new Set((data || []).map((tx: any) => tx.investor_id))];
      
      const firstDeposits = new Map<string, string>();
      
      if (investorIds.length > 0) {
        // Get first deposit per investor+fund combo
        const { data: allDeposits } = await supabase
          .from("transactions_v2")
          .select("id, investor_id, fund_id, asset, tx_date")
          .eq("type", "DEPOSIT")
          .in("investor_id", investorIds)
          .order("tx_date", { ascending: true })
          .order("id", { ascending: true });
        
        (allDeposits || []).forEach((tx: any) => {
          const key = `${tx.investor_id}-${tx.fund_id || tx.asset}`;
          if (!firstDeposits.has(key)) {
            firstDeposits.set(key, tx.id);
          }
        });
      }

      const transactions = (data || []).map((tx: any): Transaction => {
        const profile = tx.profiles;
        const fund = funds.find(f => f.id === tx.fund_id);
        const key = `${tx.investor_id}-${tx.fund_id || tx.asset}`;
        
        // Determine display type
        let displayType = tx.type;
        if (tx.type === "DEPOSIT") {
          displayType = firstDeposits.get(key) === tx.id ? "First Investment" : "Top-up";
        } else if (tx.type === "WITHDRAWAL") {
          // Check if this is a full withdrawal based on notes or amount logic
          const isFullWithdrawal = tx.notes?.toLowerCase().includes("full") || 
                                   tx.notes?.toLowerCase().includes("all") ||
                                   tx.notes?.toLowerCase().includes("complete");
          displayType = isFullWithdrawal ? "Withdrawal All" : "Withdrawal";
        } else if (tx.type === "INTEREST") {
          displayType = "Interest/Yield";
        } else if (tx.type === "FEE") {
          displayType = "Fee";
        }

        return {
          id: tx.id,
          investorId: tx.investor_id,
          investorName: profile 
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email 
            : "Unknown",
          investorEmail: profile?.email || "",
          fundId: tx.fund_id,
          fundName: fund?.name || tx.asset,
          asset: tx.asset,
          type: tx.type,
          displayType,
          amount: Number(tx.amount),
          txDate: tx.tx_date,
          status: tx.status,
          notes: tx.notes,
          createdAt: tx.created_at,
          createdBy: tx.created_by,
        };
      });

      return { transactions, totalCount: count || 0 };
    },
  });

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

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const variant = status === "completed" || status === "posted" 
      ? "default" 
      : status === "pending" 
        ? "secondary" 
        : "destructive";
    return <Badge variant={variant} className="text-xs">{status}</Badge>;
  };

  const handleInvestorClick = (investorId: string) => {
    navigate(`/admin/investors/${investorId}`);
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Transaction History</h1>
        <p className="text-muted-foreground mt-1">
          Complete chronological ledger of all investor transactions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Quick Date Filters */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={setThisMonth}>This Month</Button>
            <Button variant="outline" size="sm" onClick={setLastMonth}>Last Month</Button>
            <Button variant="outline" size="sm" onClick={setYTD}>YTD</Button>
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear All</Button>
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
          <CardTitle>
            {totalCount.toLocaleString()} Transaction{totalCount !== 1 ? "s" : ""}
          </CardTitle>
          
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
                    <TableHead className="min-w-[120px]">Date</TableHead>
                    <TableHead className="min-w-[180px]">Investor</TableHead>
                    <TableHead className="min-w-[120px]">Fund</TableHead>
                    <TableHead className="min-w-[130px]">Type</TableHead>
                    <TableHead className="text-right min-w-[140px]">Amount</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[200px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
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
                            className="text-left hover:underline group"
                          >
                            <span className="font-medium flex items-center gap-1">
                              {tx.investorName}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <span className="text-xs text-muted-foreground block">{tx.investorEmail}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CryptoIcon symbol={tx.asset} className="h-5 w-5" />
                            <span>{tx.fundName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(tx.displayType)}>
                            {tx.displayType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={tx.type === "WITHDRAWAL" || tx.type === "FEE" ? "text-destructive" : "text-green-600"}>
                            {formatAmount(tx.amount, tx.asset, tx.type)}
                          </span>
                          <span className="text-muted-foreground ml-1">{tx.asset}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(tx.status)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {tx.notes || "—"}
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
