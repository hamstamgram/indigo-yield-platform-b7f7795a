/**
 * Transaction History Page with Filters
 * Lists all events with fund, investor, date, type filters
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, Search, Filter, Download } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format } from "date-fns";

type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "FEE" | "INTEREST" | "YIELD" | "ADJUSTMENT";

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
  notes: string | null;
  createdAt: string;
}

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

function TransactionHistoryContent() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Load funds
  useEffect(() => {
    supabase
      .from("funds")
      .select("id, code, name, asset")
      .eq("status", "active")
      .order("code")
      .then(({ data }) => setFunds(data || []));
  }, []);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-transactions-history", selectedFund, selectedType, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("transactions_v2")
        .select(`
          id, investor_id, fund_id, type, asset, amount, tx_date, notes, created_at,
          profiles!fk_transactions_v2_profile (email, first_name, last_name)
        `)
        .order("tx_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(500);

      if (selectedFund !== "all") {
        query = query.eq("fund_id", selectedFund);
      }
      if (selectedType !== "all") {
        query = query.eq("type", selectedType);
      }
      if (dateFrom) {
        query = query.gte("tx_date", dateFrom);
      }
      if (dateTo) {
        query = query.lte("tx_date", dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Track first deposits per investor+fund to categorize as "First Investment"
      const firstDeposits = new Map<string, string>();
      const sortedData = [...(data || [])].sort((a, b) => 
        new Date(a.tx_date).getTime() - new Date(b.tx_date).getTime()
      );
      
      sortedData.forEach((tx: any) => {
        if (tx.type === "DEPOSIT") {
          const key = `${tx.investor_id}-${tx.fund_id || tx.asset}`;
          if (!firstDeposits.has(key)) {
            firstDeposits.set(key, tx.id);
          }
        }
      });

      return (data || []).map((tx: any): Transaction => {
        const profile = tx.profiles;
        const fund = funds.find(f => f.id === tx.fund_id);
        const key = `${tx.investor_id}-${tx.fund_id || tx.asset}`;
        
        // Determine display type
        let displayType = tx.type;
        if (tx.type === "DEPOSIT") {
          displayType = firstDeposits.get(key) === tx.id ? "First Investment" : "Top-up";
        } else if (tx.type === "WITHDRAWAL") {
          displayType = tx.notes?.toLowerCase().includes("full") || tx.notes?.toLowerCase().includes("all")
            ? "Withdrawal All" : "Withdrawal";
        }

        return {
          id: tx.id,
          investorId: tx.investor_id,
          investorName: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email : "Unknown",
          investorEmail: profile?.email || "",
          fundId: tx.fund_id,
          fundName: fund?.name || tx.asset,
          asset: tx.asset,
          type: tx.type,
          displayType,
          amount: Number(tx.amount),
          txDate: tx.tx_date,
          notes: tx.notes,
          createdAt: tx.created_at,
        };
      });
    },
  });

  const filteredTransactions = (transactions || []).filter((tx) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      tx.investorName.toLowerCase().includes(search) ||
      tx.investorEmail.toLowerCase().includes(search)
    );
  });

  const formatAmount = (amount: number, asset: string) => {
    if (asset === "BTC") return amount.toFixed(8);
    if (asset === "ETH" || asset === "SOL") return amount.toFixed(6);
    return amount.toFixed(2);
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "First Investment":
      case "Top-up":
      case "DEPOSIT":
        return "default";
      case "Withdrawal":
      case "Withdrawal All":
      case "WITHDRAWAL":
        return "destructive";
      case "FEE":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Transaction History</h1>
        <p className="text-muted-foreground mt-1">
          Complete ledger of all investor transactions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by investor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedFund} onValueChange={setSelectedFund}>
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
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="DEPOSIT">Deposits</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                <SelectItem value="FEE">Fees</SelectItem>
                <SelectItem value="INTEREST">Interest/Yield</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
              placeholder="To"
            />
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{filteredTransactions.length} Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
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
                    filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.txDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tx.investorName}</p>
                            <p className="text-xs text-muted-foreground">{tx.investorEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CryptoIcon symbol={tx.asset} className="h-5 w-5" />
                            {tx.fundName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(tx.displayType)}>{tx.displayType}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(tx.amount, tx.asset)} {tx.asset}
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
